"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import pathlib
import shutil
from itertools import chain

import drf_yasg.openapi as openapi
from core.filters import ListFilter
from core.label_config import config_essential_data_has_changed
from core.mixins import GetParentObjectMixin
from core.permissions import ViewClassPermission, all_permissions, ProjectPermissions
from core.redis import start_job_async_or_sync
from core.utils.common import paginator, paginator_help, temporary_disconnect_all_signals
from core.utils.exceptions import LabelStudioDatabaseException, ProjectExistException
from core.utils.io import find_dir, find_file, read_yaml
from data_manager.functions import filters_ordering_selected_items_exist, get_prepared_queryset
from django.conf import settings
from django.db import transaction, IntegrityError
from django.db.models import F, Q, Prefetch
from django.http import Http404
from django.utils.decorators import method_decorator
from django_filters import CharFilter, BooleanFilter, FilterSet, NumberFilter
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from ml.serializers import MLBackendSerializer
from projects.functions.next_task import get_next_task
from projects.functions.stream_history import get_label_stream_history
from projects.functions.utils import recalculate_created_annotations_and_labels_from_scratch
from projects.models import Project, ProjectImport, ProjectManager, ProjectReimport, ProjectSummary, ProjectMember
from projects.serializers import (
    GetFieldsSerializer,
    ProjectImportSerializer,
    ProjectLabelConfigSerializer,
    ProjectModelVersionExtendedSerializer,
    ProjectReimportSerializer,
    ProjectSerializer,
    ProjectSummarySerializer,
    ProjectMembersSerializer,
    BulkDeleteSerializer
)
from rest_framework import filters, generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import ValidationError as RestValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import exception_handler
from data_import.models import FileUpload
from tasks.models import Task
from tasks.serializers import (
    NextTaskSerializer,
    TaskSerializer,
    TaskSimpleSerializer,
    TaskWithAnnotationsAndPredictionsAndDraftsSerializer,
)
from webhooks.models import WebhookAction
from webhooks.utils import api_webhook, api_webhook_for_delete, emit_webhooks_for_instance
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from rest_framework.views import APIView
from users.models import User
from users.serializers import UserSerializer
from workspace.models import Workspaces
from django.shortcuts import get_object_or_404
from organizations.models import OrganizationMember
from rest_framework.generics import GenericAPIView
from ml_model_class.ml_models import MODELS

logger = logging.getLogger(__name__)


_result_schema = openapi.Schema(
    title='Labeling result',
    description='Labeling result (choices, labels, bounding boxes, etc.)',
    type=openapi.TYPE_OBJECT,
    properties={
        'from_name': openapi.Schema(
            title='from_name',
            description='The name of the labeling tag from the project config',
            type=openapi.TYPE_STRING,
        ),
        'to_name': openapi.Schema(
            title='to_name',
            description='The name of the labeling tag from the project config',
            type=openapi.TYPE_STRING,
        ),
        'value': openapi.Schema(
            title='value',
            description='Labeling result value. Format depends on chosen ML backend',
            type=openapi.TYPE_OBJECT,
        ),
    },
    example={'from_name': 'image_class', 'to_name': 'image', 'value': {'labels': ['Cat']}},
)

_task_data_schema = openapi.Schema(
    title='Task data',
    description='Task data',
    type=openapi.TYPE_OBJECT,
    example={'id': 1, 'my_image_url': '/static/samples/kittens.jpg'},
)


class ProjectListPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'


class ProjectFilterSet(FilterSet):
    ids = ListFilter(field_name='id', lookup_expr='in')
    title = CharFilter(field_name='title', lookup_expr='icontains')
    is_pinned = BooleanFilter(field_name='is_pinned')
    workspace = NumberFilter(field_name='workspace')



@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='List your projects',
        operation_description="""
    Return a list of the projects that you've created.

    To perform most tasks with the Labelo API, you must specify the project ID, sometimes referred to as the `pk`.
    To retrieve a list of your Labelo projects, update the following command to match your own environment.
    Replace the domain name, port, and authorization token, then run the following from the command line:
    ```bash
    curl -X GET {}/api/projects/ -H 'Authorization: Token abc123'
    ```
    """.format(
            settings.HOSTNAME or 'https://localhost:8080'
        ),
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Create new project',
        operation_description="""
    Create a project and set up the labeling interface in Labelo using the API.

    ```bash
    curl -H Content-Type:application/json -H 'Authorization: Token abc123' -X POST '{}/api/projects' \
    --data '{{"label_config": "<View>[...]</View>"}}'
    ```
    """.format(
            settings.HOSTNAME or 'https://localhost:8080'
        ),
    ),
)
class ProjectListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ProjectSerializer
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend,
                       filters.SearchFilter]
    filterset_class = ProjectFilterSet
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['created_at']
    # permission_required = ViewClassPermission(
    #     GET=all_permissions.projects_view,
    #     POST=all_permissions.projects_create,
    # )

    """New permission class is added for GET and POST methods"""
    permission_classes = [ProjectPermissions]

    pagination_class = ProjectListPagination

    def get_queryset(self):
        serializer = GetFieldsSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        fields = serializer.validated_data.get('include')
        filter = serializer.validated_data.get('filter')
        projects = Project.objects.filter(organization=self.request.user.active_organization).order_by(
            F('pinned_at').desc(nulls_last=True), '-created_at'
        )
        if filter in ['pinned_only', 'exclude_pinned']:
            projects = projects.filter(pinned_at__isnull=filter == 'exclude_pinned')

        if self.request.user.groups.filter(Q(name='annotator') | Q(name='reviewer') | Q(name='manager')).exists():
            project_members = ProjectMember.objects.filter(user=self.request.user)
            project_ids = project_members.values_list('project_id', flat=True)
            projects = projects.filter(id__in=project_ids)

        projects = projects.prefetch_related(
            Prefetch('tasks', queryset=Task.objects.only('data'))
        )

        return ProjectManager.with_counts_annotate(projects, fields=fields).prefetch_related('members', 'created_by')

    def get_serializer_context(self):
        context = super(ProjectListAPI, self).get_serializer_context()
        context['created_by'] = self.request.user
        return context

    def perform_create(self, ser):
        try:
            project = ser.save(organization=self.request.user.active_organization)
            user = self.request.user
            project.add_collaborator(user)
        except IntegrityError as e:
            if str(e) == 'UNIQUE constraint failed: project.title, project.created_by_id':
                raise ProjectExistException(
                    'Project with the same name already exists: {}'.format(ser.validated_data.get('title', ''))
                )
            raise LabelStudioDatabaseException('Database error during project creation. Try again.')

    def get(self, request, *args, **kwargs):
        return super(ProjectListAPI, self).get(request, *args, **kwargs)

    @api_webhook(WebhookAction.PROJECT_CREATED)
    def post(self, request, *args, **kwargs):
        return super(ProjectListAPI, self).post(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Get project by ID',
        operation_description='Retrieve information about a project by project ID.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Delete project',
        operation_description='Delete a project by specified project ID.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Update project',
        operation_description='Update the project settings for a specific project.',
        request_body=ProjectSerializer,
    ),
)
class ProjectAPI(generics.RetrieveUpdateDestroyAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Project.objects.with_counts()
    # permission_required = ViewClassPermission(
    #     GET=all_permissions.projects_view,
    #     DELETE=all_permissions.projects_delete,
    #     PATCH=all_permissions.projects_change,
    #     PUT=all_permissions.projects_change,
    #     POST=all_permissions.projects_create,
    # )

    """New permission class is added for GET,POST,PATCH,PUT and DELETE methods"""
    permission_classes = [ProjectPermissions]

    serializer_class = ProjectSerializer

    redirect_route = 'projects:project-detail'
    redirect_kwarg = 'pk'

    def get_queryset(self):
        serializer = GetFieldsSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        fields = serializer.validated_data.get('include')
        return Project.objects.with_counts(fields=fields).filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        return super(ProjectAPI, self).get(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.PROJECT_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(ProjectAPI, self).delete(request, *args, **kwargs)

    @api_webhook(WebhookAction.PROJECT_UPDATED)
    def patch(self, request, *args, **kwargs):
        project = self.get_object()
        label_config = self.request.data.get('label_config')
        workspace_id = self.request.data.get('workspace')
        image_desc_model = self.request.data.get('image_desc_model')
        nested_ml_param_keys = list(map(lambda x: list(x.get("args").keys()),MODELS.values()))
        ml_param_keys = list(chain.from_iterable(nested_ml_param_keys))

        try:
            project_member = ProjectMember.objects.get(user=request.user, project=project)
        except:
            project_member = None
        if not project_member:
            ProjectMember.objects.create(user=request.user, project=project)

        # config changes can break view, so we need to reset them
        if label_config:
            try:
                _has_changes = config_essential_data_has_changed(label_config, project.label_config)
            except KeyError:
                pass
        if workspace_id:
            workspace = Workspaces.objects.get(id=workspace_id)
            if workspace.organization != self.request.user.active_organization :
                return Response({"message": "workspace no belongs to current organization"}, status=status.HTTP_400_BAD_REQUEST)
        if image_desc_model == "null":
            image_desc_model = None
        project.description_ml_model = image_desc_model
        project.search_method = self.request.data.get("search_method")
        key = f"download_{image_desc_model}"
        ml_params = project.ml_params or {}
        if image_desc_model and not ml_params.get(key, False):
            model = MODELS.get(image_desc_model)
            if model:
                model["model"].install(request.user)
                ml_params.update({
                    key: True
                })
        for key in ml_param_keys:
            ml_params[key] = request.data.get(key, False)
        project.ml_params = ml_params
        project.save(update_fields=["description_ml_model", "search_method", "ml_params"])
        return super(ProjectAPI, self).patch(request, *args, **kwargs)

    def perform_destroy(self, instance):
        # we don't need to relaculate counters if we delete whole project
        with temporary_disconnect_all_signals():
            instance.delete()

    @swagger_auto_schema(auto_schema=None)
    @api_webhook(WebhookAction.PROJECT_UPDATED)
    def put(self, request, *args, **kwargs):
        return super(ProjectAPI, self).put(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Get next task to label',
        operation_description="""
    Get the next task for labeling. If you enable Machine Learning in
    your project, the response might include a "predictions"
    field. It contains a machine learning prediction result for
    this task.
    """,
        responses={200: TaskWithAnnotationsAndPredictionsAndDraftsSerializer()},
    ),
)  # leaving this method decorator info in case we put it back in swagger API docs
class ProjectNextTaskAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.tasks_view
    serializer_class = TaskWithAnnotationsAndPredictionsAndDraftsSerializer  # using it for swagger API docs
    queryset = Project.objects.all()
    swagger_schema = None   # this endpoint doesn't need to be in swagger API docs

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        dm_queue = filters_ordering_selected_items_exist(request.data)
        prepared_tasks = get_prepared_queryset(request, project)

        next_task, queue_info = get_next_task(request.user, prepared_tasks, project, dm_queue)

        if next_task is None:
            raise NotFound(
                f'There are still some tasks to complete for the user={request.user}, '
                f'but they seem to be locked by another user.'
            )

        # serialize task
        context = {'request': request, 'project': project, 'resolve_uri': True, 'annotations': False}
        serializer = NextTaskSerializer(next_task, context=context)
        response = serializer.data

        response['queue'] = queue_info
        return Response(response)


class LabelStreamHistoryAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.tasks_view
    queryset = Project.objects.all()
    swagger_schema = None  # this endpoint doesn't need to be in swagger API docs

    def get(self, request, *args, **kwargs):
        project = self.get_object()

        history = get_label_stream_history(request.user, project)

        return Response(history)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Validate label config',
        operation_description='Validate an arbitrary labeling configuration.',
        responses={204: 'Validation success'},
        request_body=ProjectLabelConfigSerializer,
    ),
)
class LabelConfigValidateAPI(generics.CreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (AllowAny,)
    serializer_class = ProjectLabelConfigSerializer

    def post(self, request, *args, **kwargs):
        return super(LabelConfigValidateAPI, self).post(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except RestValidationError as exc:
            context = self.get_exception_handler_context()
            response = exception_handler(exc, context)
            response = self.finalize_response(request, response)
            return response

        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Validate project label config',
        operation_description="""
        Determine whether the label configuration for a specific project is valid.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.',
            ),
        ],
        request_body=ProjectLabelConfigSerializer,
    ),
)
class ProjectLabelConfigValidateAPI(generics.RetrieveAPIView):
    """Validate label config"""

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ProjectLabelConfigSerializer
    permission_required = all_permissions.projects_change
    queryset = Project.objects.all()

    def post(self, request, *args, **kwargs):
        project = self.get_object()
        label_config = self.request.data.get('label_config')
        if not label_config:
            raise RestValidationError('Label config is not set or is empty')

        # check new config includes meaningful changes
        has_changed = config_essential_data_has_changed(label_config, project.label_config)
        project.validate_config(label_config, strict=True)
        return Response({'config_essential_data_has_changed': has_changed}, status=status.HTTP_200_OK)

    @swagger_auto_schema(auto_schema=None)
    def get(self, request, *args, **kwargs):
        return super(ProjectLabelConfigValidateAPI, self).get(request, *args, **kwargs)


class ProjectSummaryAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    serializer_class = ProjectSummarySerializer
    permission_required = all_permissions.projects_view
    queryset = ProjectSummary.objects.all()

    @swagger_auto_schema(auto_schema=None)
    def get(self, *args, **kwargs):
        return super(ProjectSummaryAPI, self).get(*args, **kwargs)


class ProjectSummaryResetAPI(GetParentObjectMixin, generics.CreateAPIView):
    """This API is useful when we need to reset project.summary.created_labels and created_labels_drafts
    and recalculate them from scratch. It's hard to correctly follow all changes in annotation region
    labels and these fields aren't calculated properly after some time. Label config changes are not allowed
    when these changes touch any labels from these created_labels* dictionaries.
    """

    parser_classes = (JSONParser,)
    parent_queryset = Project.objects.all()
    permission_required = ViewClassPermission(
        POST=all_permissions.projects_change,
    )

    @swagger_auto_schema(auto_schema=None)
    def post(self, *args, **kwargs):
        project = self.get_parent_object()
        summary = project.summary
        start_job_async_or_sync(
            recalculate_created_annotations_and_labels_from_scratch,
            project,
            summary,
            organization_id=self.request.user.active_organization.id,
        )
        return Response(status=status.HTTP_200_OK)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Get project import info',
        operation_description='Return data related to async project import operation',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project import.',
            ),
        ],
    ),
)
class ProjectImportAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    serializer_class = ProjectImportSerializer
    permission_required = all_permissions.projects_change
    queryset = ProjectImport.objects.all()
    lookup_url_kwarg = 'import_pk'


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Get project reimport info',
        operation_description='Return data related to async project reimport operation',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project reimport.',
            ),
        ],
    ),
)
class ProjectReimportAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    serializer_class = ProjectReimportSerializer
    permission_required = all_permissions.projects_change
    queryset = ProjectReimport.objects.all()
    lookup_url_kwarg = 'reimport_pk'


@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Delete all tasks',
        operation_description='Delete all tasks from a specific project.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.',
            ),
        ],
    ),
)
@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='List project tasks',
        operation_description="""
            Retrieve a paginated list of tasks for a specific project. For example, use the following cURL command:
            ```bash
            curl -X GET {}/api/projects/{{id}}/tasks/?page=1&page_size=10 -H 'Authorization: Token abc123'
            ```
        """.format(
            settings.HOSTNAME or 'https://localhost:8080'
        ),
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.',
            ),
        ]
        + paginator_help('tasks', 'Projects')['manual_parameters'],
    ),
)
class ProjectTaskListAPI(GetParentObjectMixin, generics.ListCreateAPIView, generics.DestroyAPIView):

    parser_classes = (JSONParser, FormParser)
    queryset = Task.objects.all()
    parent_queryset = Project.objects.all()
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )
    serializer_class = TaskSerializer
    redirect_route = 'projects:project-settings'
    redirect_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TaskSimpleSerializer
        else:
            return TaskSerializer

    def filter_queryset(self, queryset):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        # ordering is deprecated here
        tasks = Task.objects.filter(project=project).order_by('-updated_at')
        page = paginator(tasks, self.request)
        if page:
            return page
        else:
            raise Http404

    def delete(self, request, *args, **kwargs):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])
        task_ids = list(Task.objects.filter(project=project).values('id'))
        Task.delete_tasks_without_signals(Task.objects.filter(project=project))
        project.summary.reset()
        emit_webhooks_for_instance(request.user.active_organization, None, WebhookAction.TASKS_DELETED, task_ids)
        return Response(data={'tasks': task_ids}, status=204)

    def get(self, *args, **kwargs):
        return super(ProjectTaskListAPI, self).get(*args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, *args, **kwargs):
        return super(ProjectTaskListAPI, self).post(*args, **kwargs)

    def get_serializer_context(self):
        context = super(ProjectTaskListAPI, self).get_serializer_context()
        context['project'] = self.get_parent_object()
        return context

    def perform_create(self, serializer):
        project = self.get_parent_object()
        instance = serializer.save(project=project)
        emit_webhooks_for_instance(
            self.request.user.active_organization, project, WebhookAction.TASKS_CREATED, [instance]
        )
        return instance


class ProjectGroundTruthTaskListAPI(ProjectTaskListAPI):
    """
    Same as ProjectTaskListAPI with the exception that this API only returns tasks
    that contain at least one ground truth annotation
    """

    def filter_queryset(self, queryset):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        ground_truth_query = (
            Q(annotations__was_cancelled=False)
            & Q(annotations__result__isnull=False)
            & Q(annotations__ground_truth=True)
        )
        tasks = Task.objects.filter(project=project).filter(ground_truth_query).order_by('-updated_at')
        page = paginator(tasks, self.request)
        if page:
            return page
        else:
            raise Http404


class TemplateListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_view
    swagger_schema = None

    def list(self, request, *args, **kwargs):
        annotation_templates_dir = find_dir('annotation_templates')
        configs = []
        for config_file in pathlib.Path(annotation_templates_dir).glob('**/*.yml'):
            config = read_yaml(config_file)
            if settings.VERSION_EDITION == 'Community':
                if settings.VERSION_EDITION.lower() != config.get('type', 'community'):
                    continue
            if config.get('image', '').startswith('/static') and settings.HOSTNAME:
                # if hostname set manually, create full image urls
                config['image'] = settings.HOSTNAME + config['image']
            configs.append(config)
        template_groups_file = find_file(os.path.join('annotation_templates', 'groups.txt'))
        with open(template_groups_file, encoding='utf-8') as f:
            groups = f.read().splitlines()
        logger.debug(f'{len(configs)} templates found.')
        return Response({'templates': configs, 'groups': groups})


class ProjectSampleTask(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    queryset = Project.objects.all()
    permission_required = all_permissions.projects_view
    serializer_class = ProjectSerializer
    swagger_schema = None

    def post(self, request, *args, **kwargs):
        label_config = self.request.data.get('label_config')
        if not label_config:
            raise RestValidationError('Label config is not set or is empty')

        project = self.get_object()
        return Response({'sample_task': project.get_sample_task(label_config)}, status=200)


class ProjectModelVersions(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    swagger_schema = None
    permission_required = all_permissions.projects_view
    queryset = Project.objects.all()

    def get(self, request, *args, **kwargs):
        # TODO make sure "extended" is the right word and is
        # consistent with other APIs we've got
        extended = self.request.query_params.get('extended', False)
        include_live_models = self.request.query_params.get('include_live_models', False)
        project = self.get_object()
        data = project.get_model_versions(with_counters=True, extended=extended)

        if extended:
            serializer_models = None
            serializer = ProjectModelVersionExtendedSerializer(data, many=True)

            if include_live_models:
                ml_models = project.get_ml_backends()
                serializer_models = MLBackendSerializer(ml_models, many=True)

            # serializer.is_valid(raise_exception=True)
            return Response({'static': serializer.data, 'live': serializer_models and serializer_models.data})
        else:
            return Response(data=data)

    def delete(self, request, *args, **kwargs):
        project = self.get_object()
        model_version = request.data.get('model_version', None)

        if not model_version:
            raise RestValidationError('model_version param is required')

        count = project.delete_predictions(model_version=model_version)

        return Response(data=count)
    

class ProjectMemborsAPI(GenericAPIView):
    serializer_class = ProjectMembersSerializer

    def get(self, request, pk):
        if request.GET.get('deleted'):
            data = ProjectMember.objects.filter(project=pk)
        else:
            org_members = OrganizationMember.objects.filter(organization=request.user.active_organization, deleted_at__isnull=True).values_list('user_id', flat=True)
            data = ProjectMember.objects.filter(project=pk, user_id__in=org_members)
        assign = request.GET.get('assign')
        if assign == 'annotator':
            org_members = OrganizationMember.objects.filter(
                organization=self.request.user.active_organization,
                role='reviewer'
            ).values_list('user_id', flat=True)

            data = ProjectMember.objects.filter(project=pk).exclude(user_id__in=org_members)
        
        if assign == 'reviewer':
            org_members = OrganizationMember.objects.filter(
                organization=self.request.user.active_organization,
                role='annotater'
            ).values_list('user_id', flat=True)

            data = ProjectMember.objects.filter(project=pk).exclude(user_id__in=org_members)

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context

    def post(self, request, pk):  # Expect 'pk' parameter from URL
        try:
            # Retrieve the project instance corresponding to the provided pk
            project = Project.objects.get(id=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user_id = request.data.get('user')
        user = User.objects.get(id=user_id)
        if not user:
            return Response({'error': 'User data not provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Call the add_collaborator method to add the user as a project member
        created = project.add_collaborator(user)
        if not created:
            return Response({'error': 'Project membership already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Serialize the newly created project member
        project_member = ProjectMember.objects.get(project=project, user=user)
        serializer = ProjectMembersSerializer(project_member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def delete(self, request, pk):
        try:
            # Retrieve the project instance corresponding to the provided pk
            project = Project.objects.get(id=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user_id = request.data.get('user')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Try to retrieve the ProjectMember object
            project_member = ProjectMember.objects.get(project=project, user=user)
        except ProjectMember.DoesNotExist:
            return Response({'error': 'Project Member not found'}, status=status.HTTP_404_NOT_FOUND)
        
        
        if project.created_by == user:
            return Response({'error': 'Cannot remove the project created user'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Delete the ProjectMember object
            project_member.delete()
            
            return Response({'message': 'Project Member deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
        

        
# class GetUsersAPI(generics.ListAPIView):
#     serializer_class = UserSerializer

#     def get_queryset(self):
#         # Filter users by active organization
#         queryset = User.objects.filter(organizations=self.request.user.active_organization)

#         for user in queryset:
#             org_member = OrganizationMember.objects.filter(user=user, organization=self.request.user.active_organization)
#             print(org_member.deleted_at)
#             # if org_member and org_member.deleted_at:
#             #     print("&&&&&&&&&&&&&&& ORG DEL")
#             #     queryset = queryset.exclude(pk=user.pk)
#             #     break


#         # Get the project ID from the URL
#         project_id = self.kwargs.get('pk')

#         # Filter project members for the given project ID
#         project_members = ProjectMember.objects.filter(project=project_id)

#         # Extract user IDs of project members
#         member_user_ids = [member.user.id for member in project_members]

#         # Exclude project members from the queryset
#         queryset = queryset.exclude(id__in=member_user_ids)

#         return queryset
    

class GetUsersAPI(generics.ListAPIView):
    serializer_class = UserSerializer

    def get_queryset(self):
        # Filter users by active organization
        queryset = User.objects.filter(organizations=self.request.user.active_organization)
                    
        # Get the project ID from the URL
        project_id = self.kwargs.get('pk')

        # Filter project members for the given project ID
        project_members = ProjectMember.objects.filter(project=project_id)

        # Extract user IDs of project members
        member_user_ids = [member.user.id for member in project_members]

        # Exclude project members from the queryset
        queryset = queryset.exclude(id__in=member_user_ids)

        for user in queryset:
            org_members = OrganizationMember.objects.filter(
                user=user,
                organization=self.request.user.active_organization
            )
            for org_member in org_members:
                if org_member.deleted_at or org_member.status == 'invited':
                    queryset = queryset.exclude(pk=user.pk)
                    break

        return queryset

class DuplicateProjectAPI(generics.CreateAPIView):
    permission_classes = [ProjectPermissions]
    serializer_class = ProjectSerializer  # Assuming you use the same serializer for creating projects

    def get_serializer_context(self):
        context = super(DuplicateProjectAPI, self).get_serializer_context()
        context['created_by'] = self.request.user
        return context
    
    def perform_create(self, ser):
        try:
            project = ser.save(organization=self.request.user.active_organization)
            user = self.request.user
            project.add_collaborator(user)
        except IntegrityError as e:
            if str(e) == 'UNIQUE constraint failed: project.title, project.created_by_id':
                raise ProjectExistException(
                    'Project with the same name already exists: {}'.format(ser.validated_data.get('title', ''))
                )
            raise LabelStudioDatabaseException('Database error during project creation. Try again.')

    def get_compressed(self, task, new_project, user):
        if task.compressed:
            original_compressed_file_path = task.compressed.file.path
            original_compressed_file_name = os.path.basename(
                original_compressed_file_path)

            # Create a new directory for the new project's compressed files
            new_compressed_dir = os.path.join(settings.MEDIA_ROOT,
                                              settings.COMPRESSED_DIR,
                                              str(new_project.id))
            os.makedirs(new_compressed_dir, exist_ok=True)

            # Define the new compressed file path
            new_compressed_file_path = os.path.join(new_compressed_dir,
                                                    original_compressed_file_name)

            # Copy the original compressed file to the new directory
            shutil.copy2(original_compressed_file_path,
                         new_compressed_file_path)

            # Create a new FileUpload entry for the duplicated compressed file
            new_compressed_file_upload = FileUpload.objects.create(
                user=user,
                project=new_project,
                file=os.path.relpath(new_compressed_file_path,
                                     settings.MEDIA_ROOT)
            )
        else:
            new_compressed_file_upload = None
        return new_compressed_file_upload
    
    @api_webhook(WebhookAction.PROJECT_CREATED)
    def post(self, request, *args, **kwargs):
        original_project_id = kwargs.get('pk')
        original_project = get_object_or_404(Project, pk=original_project_id)

        project_attributes = ['label_config', 'expert_instruction', 'show_instruction',
                              'show_skip_button','sampling', 'color', 'skip_queue']
        request.data.update({attr: getattr(original_project, attr) for attr in project_attributes})

        method = request.data.get('method', 'SET')

        # Create the new project
        response = super(DuplicateProjectAPI, self).post(request, *args, **kwargs)

        if response.status_code == status.HTTP_201_CREATED and method == 'TSK':
            new_project_id = response.data['id']
            new_project = Project.objects.get(pk=new_project_id)

            # Duplicate tasks
            original_tasks = original_project.tasks.all()
            for task in original_tasks:
                get_compressed_id = self.get_compressed(task, new_project, request.user)
                Task.objects.create(
                    project=new_project,
                    data=task.data,
                    created_at=request.user,
                    compressed = get_compressed_id
                )

            # new_project.save_compressed_thumbnails()
            # new_project.save()
        return response

class BulkDeleteProjectsAPI(generics.DestroyAPIView):
    serializer_class = ProjectSerializer
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Project.objects.all()
    permission_classes = [ProjectPermissions]

    def delete(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project_ids = request.data.get('ids')
        projects = Project.objects.filter(id__in=project_ids, organization=request.user.active_organization)
        count = projects.count()
        if count != len(project_ids):
            return Response({"detail": "Some projects do not exist or do not belong to your organization."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with temporary_disconnect_all_signals():
                # Temporarily disable Django signals to prevent certain actions
                # side effects from being triggered during the execution of specific code blocks.
                for project in projects:
                    project.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error("Error deleting project: %s", e)
            return Response(
                {'error': 'An error occurred while deleting the projects'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
