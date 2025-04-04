"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

import ujson as json
from data_manager.models import Filter, FilterGroup, View
from django.conf import settings
from django.db import transaction
from projects.models import Project
from rest_framework import serializers
from tasks.models import Task, Annotation, TaskAssignee
from tasks.serializers import AnnotationDraftSerializer, AnnotationSerializer, PredictionSerializer, TaskSerializer

from labelo.core.utils.common import round_floats


class FilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filter
        fields = '__all__'

    def validate_column(self, column: str) -> str:
        """
        Ensure that the passed filter expression starts with 'filter:tasks:' and contains
        no foreign key traversals. This means either the filter expression contains no '__'
        substrings, or that it's the task.data json field that's accessed.

        Users depending on foreign key traversals in views can allowlist them via the
        DATA_MANAGER_FILTER_ALLOWLIST setting in the env.

        Edit with care. The validations below are critical for security.
        """

        column_copy = column

        # We may support 'filter:annotations:' in the future, but we don't as of yet.
        required_prefix = 'filter:tasks:'
        optional_prefix = '-'

        if not column_copy.startswith(required_prefix):
            raise serializers.ValidationError(f'Filter "{column}" should start with "{required_prefix}"')

        column_copy = column_copy[len(required_prefix) :]

        if column_copy.startswith(optional_prefix):
            column_copy = column_copy[len(optional_prefix) :]

        if column_copy.startswith('data.'):
            # Allow underscores if the filter is based on the `task.data` JSONField, because these don't leverage foreign keys.
            return column

        # Specific filters relying on foreign keys can be allowlisted
        if column_copy in settings.DATA_MANAGER_FILTER_ALLOWLIST:
            return column

        # But in general, we don't allow foreign keys
        if '__' in column_copy:
            raise serializers.ValidationError(
                f'"__" is not generally allowed in filters. Consider asking your administrator to add "{column_copy}" '
                'to DATA_MANAGER_FILTER_ALLOWLIST, but note that some filter expressions may pose a security risk'
            )

        return column


class FilterGroupSerializer(serializers.ModelSerializer):
    filters = FilterSerializer(many=True)

    class Meta:
        model = FilterGroup
        fields = '__all__'


class ViewSerializer(serializers.ModelSerializer):
    filter_group = FilterGroupSerializer(required=False)

    class Meta:
        model = View
        fields = '__all__'

    def to_internal_value(self, data):
        """
        map old filters structure to models
        "filters": {  ===> FilterGroup model
            "conjunction": "or",
            "items":[  ===> "filters" in FilterGroup
                 {  ==> Filter model
                   "filter":"filter:tasks:data.image", ==> column
                    "operator":"contains",
                    "type":"Image",
                    "value": <string: "XXX" | int: 123 | dict | list>
                 },
                  {
                    "filter":"filter:tasks:data.image",
                    "operator":"equal",
                    "type":"Image",
                    "value": <string: "XXX" | int: 123 | dict | list>
                 }
              ]
           }
        }
        """
        _data = data.get('data', {})

        filters = _data.pop('filters', {})
        conjunction = filters.get('conjunction')
        if 'filter_group' not in data and conjunction:
            data['filter_group'] = {'conjunction': conjunction, 'filters': []}
            if 'items' in filters:
                for f in filters['items']:
                    data['filter_group']['filters'].append(
                        {
                            'column': f.get('filter', ''),
                            'operator': f.get('operator', ''),
                            'type': f.get('type', ''),
                            'value': f.get('value', {}),
                        }
                    )

        ordering = _data.pop('ordering', {})
        data['ordering'] = ordering

        return super().to_internal_value(data)

    def to_representation(self, instance):
        result = super().to_representation(instance)
        filters = result.pop('filter_group', {})
        if filters:
            filters['items'] = []
            filters.pop('filters', [])
            filters.pop('id', None)

            for f in instance.filter_group.filters.order_by('index'):
                filters['items'].append(
                    {
                        'filter': f.column,
                        'operator': f.operator,
                        'type': f.type,
                        'value': f.value,
                    }
                )
            result['data']['filters'] = filters

        selected_items = result.pop('selected_items', {})
        if selected_items:
            result['data']['selectedItems'] = selected_items

        ordering = result.pop('ordering', {})
        if ordering:
            result['data']['ordering'] = ordering
        return result

    @staticmethod
    def _create_filters(filter_group, filters_data):
        filter_index = 0
        for filter_data in filters_data:
            filter_data['index'] = filter_index
            filter_group.filters.add(Filter.objects.create(**filter_data))
            filter_index += 1

    def create(self, validated_data):
        with transaction.atomic():
            filter_group_data = validated_data.pop('filter_group', None)
            if filter_group_data:
                filters_data = filter_group_data.pop('filters', [])
                filter_group = FilterGroup.objects.create(**filter_group_data)

                self._create_filters(filter_group=filter_group, filters_data=filters_data)

                validated_data['filter_group_id'] = filter_group.id
            view = self.Meta.model.objects.create(**validated_data)

            return view

    def update(self, instance, validated_data):
        with transaction.atomic():
            filter_group_data = validated_data.pop('filter_group', None)
            if filter_group_data:
                filters_data = filter_group_data.pop('filters', [])

                filter_group = instance.filter_group
                if filter_group is None:
                    filter_group = FilterGroup.objects.create(**filter_group_data)

                conjunction = filter_group_data.get('conjunction')
                if conjunction and filter_group.conjunction != conjunction:
                    filter_group.conjunction = conjunction
                    filter_group.save()

                filter_group.filters.clear()
                self._create_filters(filter_group=filter_group, filters_data=filters_data)

            ordering = validated_data.pop('ordering', None)
            if ordering and ordering != instance.ordering:
                instance.ordering = ordering
                instance.save()

            if validated_data['data'] != instance.data:
                instance.data = validated_data['data']
                instance.save()

            return instance


class DataManagerTaskSerializer(TaskSerializer):
    predictions = serializers.SerializerMethodField(required=False, read_only=True)
    annotations = AnnotationSerializer(required=False, many=True, default=[], read_only=True)
    drafts = serializers.SerializerMethodField(required=False, read_only=True)
    annotators = serializers.SerializerMethodField(required=False, read_only=True)
    
    reviewers = serializers.SerializerMethodField(required=False, read_only=True)
    inner_id = serializers.IntegerField(required=False)
    cancelled_annotations = serializers.IntegerField(required=False)
    total_annotations = serializers.IntegerField(required=False)
    total_predictions = serializers.IntegerField(required=False)
    completed_at = serializers.DateTimeField(required=False)
    annotations_results = serializers.SerializerMethodField(required=False)
    predictions_results = serializers.SerializerMethodField(required=False)
    predictions_score = serializers.FloatField(required=False)
    file_upload = serializers.SerializerMethodField(required=False)
    storage_filename = serializers.SerializerMethodField(required=False)
    annotations_ids = serializers.SerializerMethodField(required=False)
    predictions_model_versions = serializers.SerializerMethodField(required=False)
    avg_lead_time = serializers.FloatField(required=False)
    draft_exists = serializers.BooleanField(required=False)
    updated_by = serializers.SerializerMethodField(required=False, read_only=True)
    reviews_accepted = serializers.SerializerMethodField(required=False, read_only=True)
    reviews_rejected = serializers.SerializerMethodField(required=False, read_only=True)

    CHAR_LIMITS = 500

    class Meta:
        model = Task
        ref_name = 'data_manager_task_serializer'
        fields = '__all__'
        expandable_fields = {'annotations': (AnnotationSerializer, {'many': True})}

    def to_representation(self, obj):
        """Dynamically manage including of some fields in the API result"""
        ret = super(DataManagerTaskSerializer, self).to_representation(obj)
        if not self.context.get('annotations'):
            ret.pop('annotations', None)
        if not self.context.get('predictions'):
            ret.pop('predictions', None)
        return ret

    def _pretty_results(self, task, field, unique=False):
        if not hasattr(task, field) or getattr(task, field) is None:
            return ''

        result = getattr(task, field)
        if isinstance(result, str):
            output = result
            if unique:
                output = list(set(output.split(',')))
                output = ','.join(output)

        elif isinstance(result, int):
            output = str(result)
        else:
            result = [r for r in result if r is not None]
            if unique:
                result = list(set(result))
            result = round_floats(result)
            output = json.dumps(result, ensure_ascii=False)[1:-1]  # remove brackets [ ]

        return output[: self.CHAR_LIMITS].replace(',"', ', "').replace('],[', '] [').replace('"', '')

    def get_annotations_results(self, task):
        return self._pretty_results(task, 'annotations_results')

    def get_predictions_results(self, task):
        return self._pretty_results(task, 'predictions_results')

    def get_predictions(self, task):
        return PredictionSerializer(task.predictions, many=True, default=[], read_only=True).data

    @staticmethod
    def get_file_upload(task):
        if hasattr(task, 'file_upload_field'):
            file_upload = task.file_upload_field
            return os.path.basename(task.file_upload_field) if file_upload else None
        return None

    @staticmethod
    def get_storage_filename(task):
        return task.get_storage_filename()

    @staticmethod
    def get_updated_by(obj):
        return [{'user_id': obj.updated_by_id}] if obj.updated_by_id else []

    @staticmethod
    def get_reviewers(obj):
        reviewer = TaskAssignee.objects.filter(task=obj, type="RV")
        result = []
        for assignee in reviewer:
            data = {
                "user_id":assignee.assignee.id,
                "user": assignee.assignee.id,
                "reviewed": assignee.compleated,
                "review": assignee.annotation_completed.review_status.lower() + "ed"
                if assignee.annotation_completed and assignee.annotation_completed.review_status else None
            }
            if assignee.compleated and assignee.annotation_completed:
                data["annotation"] = assignee.annotation_completed.id
            result.append(data)
        return result

    @staticmethod
    def get_annotators(obj):
        if not hasattr(obj, 'annotators'):
            return []

        # annotators = obj.annotators

        # // 

        task_assignees = TaskAssignee.objects.filter(task=obj, type="AN")

        result = []

        for assignee in task_assignees:
            data = {
                "user_id":assignee.assignee.id,
                "annotated": assignee.compleated,
            }
            if assignee.compleated:
                data["annotation"] = assignee.annotation_completed.id
            result.append(data)

        completed_annotations = task_assignees.filter(compleated=True).values_list('annotation_completed', flat=True)

        task_annotations = Annotation.objects.filter(task=obj).exclude(id__in=completed_annotations)

        for annotation in task_annotations:
            data = {
                "user_id": annotation.completed_by.id,
                "annotated": True,
                "annotation": annotation.id
            }
            result.append(data)
        # print(obj.id,result)

        # if not annotators:
        #     return []
        # if isinstance(annotators, str):
        #     annotators = [int(v) for v in annotators.split(',')]

        # annotators = list(set(annotators))
        # annotators = [a for a in annotators if a is not None]
        # return annotators if hasattr(obj, 'annotators') and annotators else []

        return result

    def get_annotations_ids(self, task):
        return self._pretty_results(task, 'annotations_ids', unique=True)

    def get_predictions_model_versions(self, task):
        return self._pretty_results(task, 'predictions_model_versions', unique=True)

    def get_drafts_serializer(self):
        return AnnotationDraftSerializer

    def get_drafts_queryset(self, user, drafts):
        """Get all user's draft"""
        return drafts.filter(user=user)

    def get_drafts(self, task):
        """Return drafts only for the current user"""
        # it's for swagger documentation
        if not isinstance(task, Task) or not self.context.get('drafts'):
            return []

        drafts = task.drafts
        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            drafts = self.get_drafts_queryset(user, drafts)

        serializer_class = self.get_drafts_serializer()
        return serializer_class(drafts, many=True, read_only=True, default=True, context=self.context).data
    def get_reviews_accepted(self, task):
        annotations = Annotation.objects.filter(task=task, was_cancelled=False, review_status="Accept")
        return annotations.count()

    def get_reviews_rejected(self, task):
        annotations = Annotation.objects.filter(task=task, was_cancelled=False, review_status="Reject")
        return annotations.count()

class SelectedItemsSerializer(serializers.Serializer):
    all = serializers.BooleanField()
    included = serializers.ListField(child=serializers.IntegerField(), required=False)
    excluded = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate(self, data):
        if data['all'] is True and data.get('included'):
            raise serializers.ValidationError('included not allowed with all==true')
        if data['all'] is False and data.get('excluded'):
            raise serializers.ValidationError('excluded not allowed with all==false')

        view = self.context.get('view')
        request = self.context.get('request')
        if view and request and request.method in ('PATCH', 'DELETE'):
            all_value = view.selected_items.get('all')
            if all_value and all_value != data['all']:
                raise serializers.ValidationError('changing all value possible only with POST method')

        return data


class ViewResetSerializer(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
