"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json
import drf_yasg.openapi as openapi
from core.feature_flags import flag_set
from core.mixins import GetParentObjectMixin
from core.permissions import ViewClassPermission, all_permissions, TaskPermissions
from core.utils.common import DjangoFilterDescriptionInspector
from core.utils.params import bool_from_request
from data_manager.api import TaskListAPI as DMTaskListAPI, TaskPagination
from data_manager.functions import evaluate_predictions
from data_manager.models import PrepareParams
from data_manager.serializers import DataManagerTaskSerializer
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from projects.functions.stream_history import fill_history_annotation
from projects.models import Project, ProjectMember
from rest_framework import generics, viewsets, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from tasks.models import Annotation, AnnotationDraft, Prediction, Task, TaskAssignee, Comments, Review
from tasks.serializers import (
    AnnotationDraftSerializer,
    AnnotationSerializer,
    PredictionSerializer,
    TaskSerializer,
    TaskSimpleSerializer,
    TaskAssigneeSerializer,
    CommentsSerializer,
)
from webhooks.models import WebhookAction
from webhooks.utils import (
    api_webhook,
    api_webhook_for_delete,
    emit_webhooks_for_instance,
)
from users.models import User
from notifications.models import Notifications
from data_manager.functions import get_prepare_params
from ml_model_class.search_models import SEARCH

logger = logging.getLogger(__name__)


# TODO: fix after switch to api/tasks from api/dm/tasks
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Create task',
        operation_description='Create a new labeling task in Labelo.',
        request_body=TaskSerializer,
    ),
)
@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Get tasks list',
        operation_description="""
    Retrieve a list of tasks with pagination for a specific view or project, by using filters and ordering.
    """,
        manual_parameters=[
            openapi.Parameter(name='view', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY, description='View ID'),
            openapi.Parameter(
                name='project', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY, description='Project ID'
            ),
            openapi.Parameter(
                name='resolve_uri',
                type=openapi.TYPE_BOOLEAN,
                in_=openapi.IN_QUERY,
                description='Resolve task data URIs using Cloud Storage',
            ),
        ],
    ),
)
class TaskListAPI(DMTaskListAPI):
    serializer_class = TaskSerializer
    # permission_required = ViewClassPermission(
    #     GET=all_permissions.tasks_view,
    #     POST=all_permissions.tasks_create,
    # )
    permission_classes = [TaskPermissions]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['project']

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset.filter(project__organization=self.request.user.active_organization)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_id = self.request.data.get('project')
        if project_id:
            context['project'] = generics.get_object_or_404(Project, pk=project_id)
        return context

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = generics.get_object_or_404(Project, pk=project_id)
        instance = serializer.save(project=project)
        emit_webhooks_for_instance(
            self.request.user.active_organization, project, WebhookAction.TASKS_CREATED, [instance]
        )


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Get task',
        operation_description="""
        Get task data, metadata, annotations and other attributes for a specific labeling task by task ID.
        """,
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='Task ID'),
        ],
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Update task',
        operation_description='Update the attributes of an existing labeling task.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='Task ID'),
        ],
        request_body=TaskSimpleSerializer,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Delete task',
        operation_description='Delete a task in Labelo. This action cannot be undone!',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='Task ID'),
        ],
    ),
)
class TaskAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        PUT=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    def initial(self, request, *args, **kwargs):
        self.task = self.get_object()
        return super().initial(request, *args, **kwargs)

    @staticmethod
    def prefetch(queryset):
        return queryset.prefetch_related(
            'annotations',
            'predictions',
            'annotations__completed_by',
            'project',
            'io_storages_azureblobimportstoragelink',
            'io_storages_gcsimportstoragelink',
            'io_storages_localfilesimportstoragelink',
            'io_storages_redisimportstoragelink',
            'io_storages_s3importstoragelink',
            'file_upload',
            'project__ml_backends',
        )

    def get_retrieve_serializer_context(self, request):
        fields = ['drafts', 'predictions', 'annotations']

        return {
            'resolve_uri': True,
            'predictions': 'predictions' in fields,
            'annotations': 'annotations' in fields,
            'drafts': 'drafts' in fields,
            'request': request,
        }

    def get(self, request, pk):
        context = self.get_retrieve_serializer_context(request)
        context['project'] = project = self.task.project

        # get prediction
        if (
            project.evaluate_predictions_automatically or project.show_collab_predictions
        ) and not self.task.predictions.exists():
            evaluate_predictions([self.task])
            self.task.refresh_from_db()

        serializer = self.get_serializer_class()(
            self.task, many=False, context=context, expand=['annotations.completed_by']
        )
        data = serializer.data
        return Response(data)

    def get_queryset(self):
        task_id = self.request.parser_context['kwargs'].get('pk')
        task = generics.get_object_or_404(Task, pk=task_id)
        review = bool_from_request(self.request.GET, 'review', False)
        selected = {'all': False, 'included': [self.kwargs.get('pk')]}
        if review:
            kwargs = {'fields_for_evaluation': ['annotators', 'reviewed']}
        else:
            kwargs = {'all_fields': True}
        project = self.request.query_params.get('project') or self.request.data.get('project')
        if not project:
            project = task.project.id
        return self.prefetch(
            Task.prepared.get_queryset(
                prepare_params=PrepareParams(project=project, selectedItems=selected, request=self.request), **kwargs
            )
        )

    def get_serializer_class(self):
        # GET => task + annotations + predictions + drafts
        if self.request.method == 'GET':
            return DataManagerTaskSerializer

        # POST, PATCH, PUT
        else:
            return TaskSimpleSerializer

    def patch(self, request, *args, **kwargs):
        return super(TaskAPI, self).patch(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.TASKS_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(TaskAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(TaskAPI, self).put(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Get annotation by its ID',
        operation_description='Retrieve a specific annotation for a task using the annotation result ID.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Update annotation',
        operation_description='Update existing attributes on an annotation.',
        request_body=AnnotationSerializer,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Delete annotation',
        operation_description="Delete an annotation. This action can't be undone!",
    ),
)
class AnnotationAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        PUT=all_permissions.annotations_change,
        PATCH=all_permissions.annotations_change,
        DELETE=all_permissions.annotations_delete,
    )

    serializer_class = AnnotationSerializer
    queryset = Annotation.objects.all()

    def perform_destroy(self, annotation):
        annotation.delete()

    def update(self, request, *args, **kwargs):
        # save user history with annotator_id, time & annotation result
        annotation = self.get_object()
        # use updated instead of save to avoid duplicated signals
        Annotation.objects.filter(id=annotation.id).update(updated_by=request.user)

        task = annotation.task
        if self.request.data.get('ground_truth'):
            task.ensure_unique_groundtruth(annotation_id=annotation.id)
        task.update_is_labeled()
        task.save()  # refresh task metrics

        result = super(AnnotationAPI, self).update(request, *args, **kwargs)

        task.update_is_labeled()
        task.save(update_fields=['updated_at'])  # refresh task metrics
        return result

    def get(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).get(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_UPDATED)
    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).put(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_UPDATED)
    def patch(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).patch(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.ANNOTATIONS_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).delete(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Get all task annotations',
        operation_description='List all annotations for a task.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='Task ID'),
        ],
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Create annotation',
        operation_description="""
        Add annotations to a task like an annotator does. The content of the result field depends on your 
        labeling configuration. For example, send the following data as part of your POST 
        request to send an empty annotation with the ID of the user who completed the task:
        
        ```json
        {
        "result": {},
        "was_cancelled": true,
        "ground_truth": true,
        "lead_time": 0,
        "task": 0
        "completed_by": 123
        } 
        ```
        """,
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='Task ID'),
        ],
        request_body=AnnotationSerializer,
    ),
)
class AnnotationsListAPI(GetParentObjectMixin, generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        POST=all_permissions.annotations_create,
    )
    parent_queryset = Task.objects.all()

    serializer_class = AnnotationSerializer

    def get(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).get(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_CREATED)
    def post(self, request, *args, **kwargs):
        draft_id = request.data["draft_id"]
        try:
            draft = AnnotationDraft.objects.get(id=draft_id)
        except:
            draft = None
        comment_ids = []
        if draft:
            comments = Comments.objects.filter(draft=draft)
            comment_ids = [comment.id for comment in comments]
        res = super(AnnotationsListAPI, self).post(request, *args, **kwargs)
        annotation_id = res.data["id"]
        annotation = Annotation.objects.get(id=annotation_id)
        for comment_id in comment_ids:
            comment = Comments.objects.get(id=comment_id)
            comment.annotation = annotation
            comment.save()
        return res

    def get_queryset(self):
        task = generics.get_object_or_404(Task.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        return Annotation.objects.filter(Q(task=task) & Q(was_cancelled=False)).order_by('pk')

    def delete_draft(self, draft_id, annotation_id):
        try:
            draft = AnnotationDraft.objects.get(id=draft_id)
            # We call delete on the individual draft object because
            # AnnotationDraft#delete has special behavior (updating created_labels_drafts).
            # This special behavior won't be triggered if we call delete on the queryset.
            # Only for drafts with empty annotation_id, other ones deleted by signal
            draft.delete()
        except AnnotationDraft.DoesNotExist:
            pass

    def perform_create(self, ser):
        task = self.get_parent_object()
        # annotator has write access only to annotations and it can't be checked it after serializer.save()
        user = self.request.user

        # updates history
        result = ser.validated_data.get('result')
        extra_args = {'task_id': self.kwargs['pk'], 'project_id': task.project_id}

        # save stats about how well annotator annotations coincide with current prediction
        # only for finished task annotations
        if result is not None:
            prediction = Prediction.objects.filter(task=task, model_version=task.project.model_version)
            if prediction.exists():
                prediction = prediction.first()
                prediction_ser = PredictionSerializer(prediction).data
            else:
                logger.debug(f'User={self.request.user}: there are no predictions for task={task}')
                prediction_ser = {}
            # serialize annotation
            extra_args.update({'prediction': prediction_ser, 'updated_by': user})

        if 'was_cancelled' in self.request.GET:
            extra_args['was_cancelled'] = bool_from_request(self.request.GET, 'was_cancelled', False)

        if 'completed_by' not in ser.validated_data:
            extra_args['completed_by'] = self.request.user

        draft_id = self.request.data.get('draft_id')
        draft = AnnotationDraft.objects.filter(id=draft_id).first()
        if draft:
            # draft permission check
            if draft.task_id != task.id or not draft.has_permission(user) or draft.user_id != user.id:
                raise PermissionDenied(f'You have no permission to draft id:{draft_id}')

        if draft is not None and flag_set(
            'fflag_feat_back_lsdv_5035_use_created_at_from_draft_for_annotation_256052023_short', user='auto'
        ):
            # if the annotation will be created from draft - get created_at from draft to keep continuity of history
            extra_args['draft_created_at'] = draft.created_at

        # create annotation
        logger.debug(f'User={self.request.user}: save annotation')
        annotation = ser.save(**extra_args)

        logger.debug(f'Save activity for user={self.request.user}')
        self.request.user.activity_at = timezone.now()
        self.request.user.save()

        # Release task if it has been taken at work (it should be taken by the same user, or it makes sentry error
        logger.debug(f'User={user} releases task={task}')
        task.release_lock(user)

        # if annotation created from draft - remove this draft
        if draft_id is not None:
            logger.debug(f'Remove draft {draft_id} after creating annotation {annotation.id}')
            self.delete_draft(draft_id, annotation.id)

        if self.request.data.get('ground_truth'):
            annotation.task.ensure_unique_groundtruth(annotation_id=annotation.id)

        fill_history_annotation(user, task, annotation)

        return annotation


class AnnotationDraftListAPI(generics.ListCreateAPIView):

    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = AnnotationDraftSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        POST=all_permissions.annotations_create,
    )
    queryset = AnnotationDraft.objects.all()
    swagger_schema = None

    def filter_queryset(self, queryset):
        task_id = self.kwargs['pk']
        return queryset.filter(task_id=task_id)

    def perform_create(self, serializer):
        task_id = self.kwargs['pk']
        annotation_id = self.kwargs.get('annotation_id')
        user = self.request.user
        try:
            task = Task.objects.get(id=self.kwargs['pk'])
            project_member = ProjectMember.objects.get(user=user, project=task.project)
        except:
            project_member = None
        if not project_member:
            ProjectMember.objects.create(user=user, project=task.project)
        logger.debug(f'User {user} is going to create draft for task={task_id}, annotation={annotation_id}')
        serializer.save(task_id=self.kwargs['pk'], annotation_id=annotation_id, user=self.request.user)


class AnnotationDraftAPI(generics.RetrieveUpdateDestroyAPIView):

    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = AnnotationDraftSerializer
    queryset = AnnotationDraft.objects.all()
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        PUT=all_permissions.annotations_change,
        PATCH=all_permissions.annotations_change,
        DELETE=all_permissions.annotations_delete,
    )
    swagger_schema = None


@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['Predictions'],
        operation_summary='List predictions',
        filter_inspectors=[DjangoFilterDescriptionInspector],
        operation_description='List all predictions and their IDs.',
    ),
)
@method_decorator(
    name='create',
    decorator=swagger_auto_schema(
        tags=['Predictions'],
        operation_summary='Create prediction',
        operation_description='Create a prediction for a specific task.',
    ),
)
@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['Predictions'],
        operation_summary='Get prediction details',
        operation_description='Get details about a specific prediction by its ID.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='Prediction ID'),
        ],
    ),
)
@method_decorator(
    name='update',
    decorator=swagger_auto_schema(
        tags=['Predictions'],
        operation_summary='Put prediction',
        operation_description='Overwrite prediction data by prediction ID.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='Prediction ID'),
        ],
    ),
)
@method_decorator(
    name='partial_update',
    decorator=swagger_auto_schema(
        tags=['Predictions'],
        operation_summary='Update prediction',
        operation_description='Update prediction data by prediction ID.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='Prediction ID'),
        ],
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['Predictions'],
        operation_summary='Delete prediction',
        operation_description='Delete a prediction by prediction ID.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_INTEGER, in_=openapi.IN_PATH, description='Prediction ID'),
        ],
    ),
)
class PredictionAPI(viewsets.ModelViewSet):
    serializer_class = PredictionSerializer
    permission_required = all_permissions.predictions_any
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'task__project', 'project']

    def get_queryset(self):
        if flag_set(
            'fflag_perf_back_lsdv_4695_update_prediction_query_to_use_direct_project_relation',
            user='auto',
        ):
            return Prediction.objects.filter(project__organization=self.request.user.active_organization)
        else:
            return Prediction.objects.filter(task__project__organization=self.request.user.active_organization)


@method_decorator(name='get', decorator=swagger_auto_schema(auto_schema=None))
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Convert annotation to draft',
        operation_description='Convert annotation to draft',
    ),
)
class AnnotationConvertAPI(generics.RetrieveAPIView):
    permission_required = ViewClassPermission(POST=all_permissions.annotations_change)
    queryset = Annotation.objects.all()

    def process_intermediate_state(self, annotation, draft):
        pass

    @swagger_auto_schema(auto_schema=None)
    def post(self, request, *args, **kwargs):
        annotation = self.get_object()
        organization = annotation.project.organization
        project = annotation.project

        pk = annotation.pk

        with transaction.atomic():
            draft = AnnotationDraft.objects.create(
                result=annotation.result,
                lead_time=annotation.lead_time,
                task=annotation.task,
                annotation=None,
                user=request.user,
            )

            self.process_intermediate_state(annotation, draft)

            annotation.delete()

        emit_webhooks_for_instance(organization, project, WebhookAction.ANNOTATIONS_DELETED, [pk])
        data = AnnotationDraftSerializer(instance=draft).data
        return Response(status=201, data=data)

class TaskAsigneeAPI(generics.ListCreateAPIView):

    serializer_class = TaskAssigneeSerializer

    def get_queryset(self):
        selected_items = self.request.GET.get('selectedItemsData', '')
        selected_data = json.loads(selected_items)
        task_ids = []
        task_ex_ids = []
        if selected_data['all']:
            task_ex_ids = selected_data.get('excluded', [])
        else:
            task_ids = selected_data.get('included', [])
        task_type = self.request.GET.get('type', '')
        # Convert task IDs to integers
        task_ids = list(map(int, task_ids))
        task_ex_ids = list(map(int, task_ex_ids))
        project_id = self.request.GET.get('project', '')
        if selected_data['all']:
            task_objs = Task.objects.filter(project_id=project_id).exclude(
                id__in=task_ex_ids)
            if len(task_objs) == 1:
                queryset = TaskAssignee.objects.filter(task_id=task_objs.first().id, type=task_type)
            else:
                queryset = TaskAssignee.objects.none()
        else:
            if len(task_ids) == 1:
                queryset = TaskAssignee.objects.filter(task=task_ids[0], task__project_id=project_id,
                                                       type=task_type)
            else:
                queryset = TaskAssignee.objects.none()
        return queryset

    def post(self, request, *args, **kwargs):
        selected_items = request.data.get('selectedItems', '')
        selected_data = json.loads(selected_items)
        users = request.data.get('users')
        task_type = request.data.get('type', '')
        project = request.data.get('project', '')

        if not task_type:
            return Response({'error': 'Invalid input data'},
                            status=status.HTTP_400_BAD_REQUEST)

        task_ids = []
        task_ex_ids = []

        if selected_data['all']:
            if 'excluded' in selected_data:
                task_ex_ids = selected_data["excluded"]
        else:
            if 'included' in selected_data:
                task_ids = selected_data["included"]

        # Ensure task_ids and task_ex_ids are lists of integers
        task_ids = [int(task_id) for task_id in task_ids]
        task_ex_ids = [int(task_ex_id) for task_ex_id in task_ex_ids]

        # Determine the tasks to process
        if selected_data['all'] and not task_ex_ids:
            task_objs = Task.objects.filter(project_id=project)
        elif selected_data['all']:
            task_objs = Task.objects.filter(project_id=project).exclude(id__in=task_ex_ids)
        else:
            task_objs = Task.objects.filter(id__in=task_ids,project_id=project).exclude(
                id__in=task_ex_ids)
        user_objs = User.objects.filter(id__in=users)

        if user_objs.exists():
            for user in user_objs:
                task_count = 0
                for task in task_objs:
                    if not Annotation.objects.filter(task=task,
                                                     completed_by=user).exists():
                        task_assignee, created = TaskAssignee.objects.get_or_create(
                            task=task, assignee=user, type=task_type
                        )
                        if created:
                            task_count += 1
                if task_count > 0:
                    try:
                        content = (
                            f"You have been assigned {task_count} tasks to annotate in Project {task.project.title}."
                            if task_type == "AN"
                            else f"You have been assigned {task_count} tasks to review in Project {task.project.title}."
                        )
                        title = "Annotation Task Assigned" if task_type == "AN" else "Review Task Assigned"
                        notification = Notifications.objects.create(
                            project=task.project, user=user,
                            from_user=request.user, title=title,
                            notification=content
                        )
                        notification.send()
                    except Exception as e:
                        logger.error(f"Error sending notification: {e}")

        if len(task_ids) == 1:
            task = task_objs.first()
            TaskAssignee.objects.filter(task=task, type=task_type).exclude(
                assignee__in=user_objs).delete()

        return Response({'status': 'Tasks assigned successfully'},
                        status=status.HTTP_200_OK)
      
class CommentAPI(generics.ListCreateAPIView):
    serializer_class = CommentsSerializer

    def get_queryset(self):
        if "draft" in self.request.GET:
            return Comments.objects.filter(draft=int(self.request.GET.get('draft')))
        if "annotation" in self.request.GET:
            return Comments.objects.filter(annotation=int(self.request.GET.get('annotation')))

    def post(self, request, *args, **kwargs):
        project = Project.objects.get(id=int(request.data['project']))
        draft = None
        annotation = None
        if "draft" in self.request.data:
            draft = AnnotationDraft.objects.get(id=int(request.data['draft']))
        if "annotation" in self.request.data:
            annotation = Annotation.objects.get(id=int(request.data['annotation']))
        comment = Comments(created_by=request.user, project=project, annotation=annotation, draft=draft,
                           text=request.data['text'])
        comment.save()
        return Response(data=CommentsSerializer(comment).data, status=status.HTTP_200_OK)


class UpdateCommentAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentsSerializer
    queryset = Comments.objects.all()

    def patch(self, request, *args, **kwargs):
        comment = Comments.objects.get(id=int(request.data['id']))
        if 'text' in request.data:
            comment.text = request.data['text']
            comment.updated_at = timezone.now()
            comment.save()
        if 'is_resolved' in request.data:
            comment.is_resolved = request.data['is_resolved']
            comment.save()
        return Response(data={}, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        Comments.objects.get(id=int(request.data['id'])).delete()
        return Response(data={}, status=status.HTTP_200_OK)


class AnnotationReviewAPI(generics.UpdateAPIView):
    serializer_class = AnnotationSerializer

    queryset = Annotation.objects.all()

    def patch(self, request, *args, **kwargs):
        annotation = Annotation.objects.get(id=int(kwargs['pk']))
        annotation.review_status = request.data['mode']
        if "comment" in request.data and request.data['comment'].get("id"):
            comment = Comments.objects.get(id=int(request.data['comment']['id']))
            annotation.reject_comment = comment
        annotation.save()
        reviewer = TaskAssignee.objects.get(type="RV", assignee=request.user, task=annotation.task)
        reviewer.compleated = request.data['mode'] in ["Accept", "Fix"]
        reviewer.annotation_completed = annotation
        reviewer.save()
        return Response(data={}, status=status.HTTP_200_OK)


class TaskSearch(generics.ListAPIView):
    serializer_class = DataManagerTaskSerializer
    pagination_class = TaskPagination

    def get_queryset(self):
        project_id = int(self.request.query_params.get("project"))
        search = self.request.query_params.get("search")
        project = Project.objects.get(id=project_id)
        prepare_params = get_prepare_params(self.request, project)
        tasks = Task.prepared.only_filtered(prepare_params=prepare_params)
        match_tasks = self.match_search(tasks, search, project)
        return match_tasks

    def match_search(self, tasks, search, project):
        search_method = project.search_method
        mdl = SEARCH.get(search_method)
        if not mdl:
            return []
        model = mdl["model"]
        return model().search(search, tasks)



    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_id = self.request.parser_context.get("kwargs").get("project_id")
        if project_id:
            context['project'] = generics.get_object_or_404(Project, pk=project_id)
        return context

