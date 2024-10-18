import json
from .models import ProjectTemplate
from django.db import transaction, IntegrityError
from core.permissions import ProjectPermissions

from projects.models import Project
from projects.serializers import ProjectSerializer
from .serializers import ProjectTemplateSerializer
from core.utils.exceptions import LabelStudioDatabaseException, ProjectExistException
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from webhooks.models import WebhookAction
from webhooks.utils import api_webhook
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser


class CreateProjectFromTemplate(generics.ListCreateAPIView):
    """API view to create a new project using an existing project template."""
    queryset = ProjectTemplate.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super(CreateProjectFromTemplate, self).get_serializer_context()
        context['created_by'] = self.request.user
        return context

    def perform_create(self, ser):
        try:
            project = ser.save(
                organization=self.request.user.active_organization)
            user = self.request.user
            project.add_collaborator(user)
        except IntegrityError as e:
            if str(e) == 'UNIQUE constraint failed: project.title, project.created_by_id':
                raise ProjectExistException(
                    'Project with the same name already exists: {}'.format(
                        ser.validated_data.get('title', ''))
                )
            raise LabelStudioDatabaseException(
                'Database error during project creation. Try again.')

    @api_webhook(WebhookAction.PROJECT_CREATED)
    def post(self, request, *args, **kwargs):
        template = ProjectTemplate.objects.get(pk=request.data.get('template'))

        project_attributes = ['label_config', 'expert_instruction',
                              'show_instruction',
                              'show_skip_button', 'sampling', 'color',
                              'skip_queue']
        request.data.update({attr: getattr(template, attr) for attr in
                             project_attributes})



        # Create the new project
        response = super(CreateProjectFromTemplate, self).post(request, *args,
                                                         **kwargs)
        return response


class ProjectTemplateViewSet(generics.ListCreateAPIView):
    """API view to create a new project template."""
    queryset = ProjectTemplate.objects.all()
    serializer_class = ProjectTemplateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def post(self, request, *args, **kwargs):
        request.data['created_by'] = self.request.user.id
        # project_id = request.data.get('project_id')
        project = Project.objects.get(pk=request.data.get('project_id'))
        if project:
            project_attributes = ['label_config', 'expert_instruction',
                                  'task_data_login', 'task_data_password', 'control_weights',
                                  'parsed_label_config', 'skip_queue', 'show_instruction', 'show_skip_button',
                                  'sampling', 'color', 'is_published', 'enable_empty_annotation']
            request.data.update({attr: getattr(project, attr) for attr in
                 project_attributes})
            request.data['organization'] = self.request.user.active_organization.id
            # datas_json = json.dumps(datas)
            # request.data['project_settings'] = datas_json
        return super(ProjectTemplateViewSet, self).post(request, *args, **kwargs)


class ProjectTemplateDetails(generics.RetrieveUpdateDestroyAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = ProjectTemplate.objects.all()
    serializer_class = ProjectTemplateSerializer
    permission_classes = [IsAuthenticated]
    permission_classes = [ProjectPermissions]
    redirect_route = 'projects_template:template-detail'
    redirect_kwarg = 'pk'
    # lookup_field = 'pk'
