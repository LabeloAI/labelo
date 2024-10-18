"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import mimetypes

import bleach

from django.conf import settings
from django.db.models import Q, Avg

from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers
from rest_framework.serializers import SerializerMethodField

from constants import SAFE_HTML_ATTRIBUTES, SAFE_HTML_TAGS

from projects.models import (Project, ProjectImport, ProjectOnboarding, ProjectReimport, ProjectSummary, ProjectMember)
from tasks.models import (Task, Annotation, TaskAssignee)
from data_import.models import FileUpload
from users.serializers import UserSimpleSerializer, BaseUserSerializer



class CreatedByFromContext:
    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context.get('created_by')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = settings.AUTH_USER_MODEL
        fields = ['id', 'email', 'avatar']

class ProjectSerializer(FlexFieldsModelSerializer):
    """Serializer get numbers from project queryset annotation,
    make sure, that you use correct one(Project.objects.with_counts())
    """

    task_number = serializers.IntegerField(default=None, read_only=True, help_text='Total task number in project')
    total_annotations_number = serializers.IntegerField(
        default=None,
        read_only=True,
        help_text='Total annotations number in project including '
        'skipped_annotations_number and ground_truth_number.',
    )
    total_predictions_number = serializers.IntegerField(
        default=None,
        read_only=True,
        help_text='Total predictions number in project including '
        'skipped_annotations_number, ground_truth_number, and '
        'useful_annotation_number.',
    )
    useful_annotation_number = serializers.IntegerField(
        default=None,
        read_only=True,
        help_text='Useful annotation number in project not including '
        'skipped_annotations_number and ground_truth_number. '
        'Total annotations = annotation_number + '
        'skipped_annotations_number + ground_truth_number',
    )
    ground_truth_number = serializers.IntegerField(
        default=None, read_only=True, help_text='Honeypot annotation number in project'
    )
    skipped_annotations_number = serializers.IntegerField(
        default=None, read_only=True, help_text='Skipped by collaborators annotation number in project'
    )
    num_tasks_with_annotations = serializers.IntegerField(
        default=None, read_only=True, help_text='Tasks with annotations count'
    )

    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='Project owner')

    parsed_label_config = SerializerMethodField(
        default=None, read_only=True, help_text='JSON-formatted labeling configuration'
    )
    start_training_on_annotation_update = SerializerMethodField(
        default=None, read_only=False, help_text='Start model training after any annotations are submitted or updated'
    )
    config_has_control_tags = SerializerMethodField(
        default=None, read_only=True, help_text='Flag to detect is project ready for labeling'
    )
    finished_task_number = serializers.IntegerField(default=None, read_only=True, help_text='Finished tasks')

    queue_total = serializers.SerializerMethodField()
    queue_done = serializers.SerializerMethodField()
    review_queue_done = SerializerMethodField(default=None, read_only=True, help_text='Review queue tasks completed')
    review_queue_total = SerializerMethodField(default=None, read_only=True, help_text='Review queue tasks Total')


    # new field to serializer
    thumbnail_image = serializers.SerializerMethodField()
    labels = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    @property
    def user_id(self):
        try:
            return self.context['request'].user.id
        except KeyError:
            return next(iter(self.context['user_cache']))

    @staticmethod
    def get_config_has_control_tags(project):
        return len(project.get_parsed_config()) > 0

    @staticmethod
    def get_parsed_label_config(project):
        return project.get_parsed_config()
    
    @staticmethod
    def get_labels(project):
        label_config  =  project.get_parsed_config()
        labels = []
        if label_config is not None:
            first_key = next(iter(label_config), None)
            if first_key is not None:
                labels = label_config[first_key].get('labels', [])
        
        return labels
        

    def get_start_training_on_annotation_update(self, instance):
        # FIXME: remake this logic with start_training_on_annotation_update
        return True if instance.min_annotations_to_start_training else False

    def to_internal_value(self, data):
        # FIXME: remake this logic with start_training_on_annotation_update
        initial_data = data
        data = super().to_internal_value(data)

        if 'start_training_on_annotation_update' in initial_data:
            data['min_annotations_to_start_training'] = int(initial_data['start_training_on_annotation_update'])

        if 'expert_instruction' in initial_data:
            data['expert_instruction'] = bleach.clean(
                initial_data['expert_instruction'], tags=SAFE_HTML_TAGS, attributes=SAFE_HTML_ATTRIBUTES
            )

        return data

    def get_thumbnail_image(self, project):
        thumbnail_map = {}
        thumbnails = list(FileUpload.objects.filter(
            project=project,
            file__contains='_compressed.jpg'
        ).values_list('file', flat=True))[:3]
        if len(thumbnails) < 3:
            tasks = Task.objects.filter(project=project).values_list('data', 'file_upload_id',
                                                                     'id')[:3]
            if thumbnails and tasks.count() < 3:
                return thumbnails
            for data, file_upload_id, task_id in tasks:
                try:
                    url = next(iter(data.values()), None)
                    mime, _ = mimetypes.guess_type(url)
                    # print(f"Mime of {project} : ", mime)
                    if mime and mime.startswith('image'):
                        cleaned_url = url.replace("/data/", "")
                        try:
                            file_upload = FileUpload.objects.get(file=cleaned_url)
                            relative_compressed_path, compressed_file = project.compress_image(
                                file_upload.file.path)
                            if relative_compressed_path and compressed_file:
                                thumbnails = []
                                thumbnails.append(relative_compressed_path)
                                # Create file uploads for the compressed images
                                thumbnail, created = FileUpload.objects.get_or_create(
                                    user=project.created_by,
                                    project=project,
                                    file=relative_compressed_path
                                )
                                thumbnail_map[file_upload_id] = thumbnail
                                # Update the task with the compressed file
                                Task.objects.filter(id=task_id).update(
                                    compressed=thumbnail.id)
                        except FileUpload.DoesNotExist:
                            continue
                    else:
                        thumbnails.append("text" if mime is None else mime)
                except:
                    thumbnails.append("text")
        return thumbnails

    def get_members(self, project):
        project_members = ProjectMember.objects.filter(project=project, enabled=True).select_related('user')
        user_data = []
        for member in project_members:
            user = member.user
            user_data.append({
                'id': user.id,
                'email': user.email,
                'avatar': user.avatar.url if user.avatar else None  # assuming avatar is an ImageField or similar
            })
        return user_data


    class Meta:
        model = Project
        extra_kwargs = {
            'memberships': {'required': False},
            'title': {'required': False},
            'created_by': {'required': False},
        }
        fields = [
            'id',
            'title',
            'description',
            'label_config',
            'expert_instruction',
            'show_instruction',
            'show_skip_button',
            'enable_empty_annotation',
            'show_annotation_history',
            'organization',
            'color',
            'maximum_annotations',
            'is_published',
            'model_version',
            'is_draft',
            'created_by',
            'created_at',
            'min_annotations_to_start_training',
            'start_training_on_annotation_update',
            'show_collab_predictions',
            'num_tasks_with_annotations',
            'task_number',
            'useful_annotation_number',
            'ground_truth_number',
            'skipped_annotations_number',
            'total_annotations_number',
            'total_predictions_number',
            'sampling',
            'show_ground_truth_first',
            'show_overlap_first',
            'overlap_cohort_percentage',
            'task_data_login',
            'task_data_password',
            'control_weights',
            'parsed_label_config',
            'evaluate_predictions_automatically',
            'config_has_control_tags',
            'skip_queue',
            'reveal_preannotations_interactively',
            'pinned_at',
            'finished_task_number',
            'queue_total',
            'queue_done',
            'review_queue_done',
            'review_queue_total',
            'workspace',
            'is_pinned',
            'thumbnail_image', #thumbnail_image
            'labels',
            'task_distribution',
            'show_dm_to_annotators',
            'members',
            'review_distribution',
            'show_review_instruction',
            'review_instruction',
            'require_comments_on_skip',
            'show_dm_to_reviewers',
            'description_ml_model',
            'search_method',
            'ml_params'
        ]

    def validate_label_config(self, value):
        if self.instance is None:
            # No project created yet
            Project.validate_label_config(value)
        else:
            # Existing project is updated
            self.instance.validate_config(value)
        return value

    def validate_model_version(self, value):
        """Custom model_version validation"""
        p = self.instance

        # Only run the validation if model_version is about to change
        # and it contains a string
        if p is not None and p.model_version != value and value != '':
            # that model_version should either match live ml backend
            # or match version in predictions

            if p.ml_backends.filter(title=value).union(p.predictions.filter(project=p, model_version=value)).exists():
                return value
            else:
                raise serializers.ValidationError(
                    "Model version doesn't exist either as live model or as static predictions."
                )

        return value

    def update(self, instance, validated_data):
        if validated_data.get('show_collab_predictions') is False:
            instance.model_version = ''

        return super().update(instance, validated_data)

    def get_queue_total(self, project):

        if project.task_distribution == 'MANUEL':
            request = self.context.get('request')
            tasks = project.get_tasks()
            task_ids = TaskAssignee.objects.filter(
                assignee=request.user,
                task__in=tasks,
                type='AN'
            ).values('task_id')
            return len(task_ids)
        
        remain = project.tasks.filter(
            Q(is_labeled=False) & ~Q(annotations__completed_by_id=self.user_id)
            | Q(annotations__completed_by_id=self.user_id)
        ).distinct()
        return remain.count()

    def get_queue_done(self, project):

        if project.task_distribution == 'MANUEL':
            request = self.context.get('request')
            tasks = project.get_tasks()
            task_ids = TaskAssignee.objects.filter(
                assignee=request.user,
                task__in=tasks,
                type='AN',
                compleated=True
            ).values('task_id')
            return len(task_ids)
        
        tasks_filter = {
            'project': project,
            'annotations__completed_by_id': self.user_id,
        }

        if project.skip_queue == project.SkipQueue.REQUEUE_FOR_ME:
            tasks_filter['annotations__was_cancelled'] = False

        already_done_tasks = Task.objects.filter(**tasks_filter)
        result = already_done_tasks.distinct().count()

        return result


    def get_review_queue_done(self, project):
        if project.review_distribution == 'MANUEL':
            request = self.context.get('request')
            tasks = project.get_tasks()
            task_ids = TaskAssignee.objects.filter(
                assignee=request.user,
                task__in=tasks,
                type='RV',
                compleated=True
            ).values('task_id')
            return len(task_ids)

        annotations = Annotation.objects.filter(project=project, was_cancelled=False, review_status__isnull=False)
        return annotations.count()

    def get_review_queue_total(self, project):
        if project.review_distribution == 'MANUEL':
            request = self.context.get('request')
            tasks = project.get_tasks()
            task_ids = TaskAssignee.objects.filter(
                assignee=request.user,
                task__in=tasks,
                type='RV',
            ).values('task_id')

            return len(task_ids)

        annotations = Annotation.objects.filter(project=project, was_cancelled=False)
        return annotations.count()


class ProjectOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectOnboarding
        fields = '__all__'


class ProjectLabelConfigSerializer(serializers.Serializer):
    label_config = serializers.CharField(help_text=Project.label_config.field.help_text)

    def validate_label_config(self, config):
        Project.validate_label_config(config)
        return config


class ProjectSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectSummary
        fields = '__all__'


class ProjectImportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectImport
        fields = '__all__'


class ProjectReimportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectReimport
        fields = '__all__'


class ProjectModelVersionExtendedSerializer(serializers.Serializer):
    model_version = serializers.CharField()
    count = serializers.IntegerField()
    latest = serializers.DateTimeField()


class GetFieldsSerializer(serializers.Serializer):
    include = serializers.CharField(required=False)
    filter = serializers.CharField(required=False, default='all')

    def validate_include(self, value):
        if value is not None:
            value = value.split(',')
        return value

    def validate_filter(self, value):
        if value in ['all', 'pinned_only', 'exclude_pinned']:
            return value
        
class MemberAnnotationsSerializer(serializers.Serializer):

    total_annotations = serializers.IntegerField()
    finished_annotations = serializers.IntegerField()
    skipped_annotations = serializers.IntegerField()
    accepted_annotations = serializers.IntegerField()
    rejected_annotations = serializers.IntegerField()
    review_score = serializers.FloatField()
    mean_time = serializers.FloatField()

class ProjectMembersSerializer(serializers.ModelSerializer):
    user = BaseUserSerializer()
    class Meta:
        model = ProjectMember
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['annotations'] = self.get_annotations(instance)
        return representation
    
    def get_annotations(self, instance):
        annotations = Annotation.objects.filter(project=instance.project, completed_by_id=instance.user)
        
        total_annotations_count = annotations.count()
        finished_annotations_count = annotations.filter(was_cancelled=False).count()
        skipped_annotations_count = annotations.filter(was_cancelled=True).count()
        accepted_annotations_count = annotations.filter(review_status='Accept').count()
        rejected_annotations_count = annotations.filter(review_status='Reject').count()
        
        review_score = 0
        if (accepted_annotations_count + rejected_annotations_count) > 0:
            review_score = (accepted_annotations_count / (accepted_annotations_count + rejected_annotations_count)) * 100
        
        mean_time = annotations.aggregate(avg_lead_time=Avg('lead_time'))['avg_lead_time'] or 0
        mean_time = round(mean_time, 2)

        annotations_data = {
            "total_annotations": total_annotations_count, 
            "finished_annotations": finished_annotations_count,
            "skipped_annotations": skipped_annotations_count,
            "accepted_annotations": accepted_annotations_count,
            "rejected_annotations": rejected_annotations_count,
            "review_score": review_score,
            "mean_time": mean_time,
        }
        
        return MemberAnnotationsSerializer(annotations_data).data

class BulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
