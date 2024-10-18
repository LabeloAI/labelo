from rest_framework import serializers
from tasks.models import Task
from .models import ProjectDashboardLayout

class DashboardLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDashboardLayout
        fields = '__all__'

class LabelDistributionSerializer(serializers.Serializer):
    name = serializers.ListField(child=serializers.CharField())
    count = serializers.ListField(child=serializers.IntegerField())
    time = serializers.ListField(child=serializers.FloatField())

class ProjectDashboardSerializer(serializers.Serializer):
    total_tasks = serializers.IntegerField()
    overall_progress = serializers.FloatField()
    completed_task = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    skipped_tasks = serializers.IntegerField()
    overview_task = serializers.DictField()
    # label_distribution = DashboardSerializer()
    # label_distribution = LabelDistributionSerializer()


class AnnotatorPerformanceSerializer(serializers.Serializer):
    # annotator_id = serializers.IntegerField()
    total_annotations = serializers.IntegerField()
    average_lead_time = serializers.FloatField()
    minimum_lead_time = serializers.FloatField()
    maximum_lead_time = serializers.FloatField()

class ProjectPerformanceSerializer(serializers.Serializer):
    total_lead_time = serializers.FloatField()
    average_lead_time = serializers.FloatField()
    average_time_per_label = serializers.FloatField()
    annotator_performance = serializers.DictField()
    task_performance = serializers.DictField()
    label_distribution = serializers.ListField()

