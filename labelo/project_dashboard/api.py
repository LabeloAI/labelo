from django.utils import timezone
from datetime import datetime, timedelta
from tasks.models import Annotation, Task
from projects.models import Project
from rest_framework import generics,viewsets,status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ProjectDashboardLayout
from collections import defaultdict
from django.db.models import Avg, Sum, F
from .serializers import ProjectDashboardSerializer, \
    ProjectPerformanceSerializer, DashboardLayoutSerializer


class ProjectDashboardLayoutApi(generics.CreateAPIView, generics.UpdateAPIView):
    queryset = ProjectDashboardLayout.objects.all()
    serializer_class = DashboardLayoutSerializer

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project does not exist.'},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            dashboard = ProjectDashboardLayout.objects.get(project=pk)
            serializer = self.get_serializer(dashboard, data=request.data,
                                             partial=True)
        except ProjectDashboardLayout.DoesNotExist:
            request.data['project'] = pk
            serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        self.perform_create_or_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def perform_create_or_update(self, serializer):
        serializer.save()

    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project does not exist.'},
                            status=status.HTTP_404_NOT_FOUND)
        try:
            dashboard = ProjectDashboardLayout.objects.get(project_id=pk)
        except ProjectDashboardLayout.DoesNotExist:
            dashboard = None
            # return dashboard
        serializer = self.get_serializer(dashboard)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectDashboardAPI(APIView):
    """
    API endpoint to display project progress and statistics.

    This endpoint provides an overview of project's progress, including total tasks,
    overall completion percentage, and the number of tasks completed and in progress.
    """

    def get(self, request, pk):
        """
        Retrieves and returns progress statistics for a specific project identified by `pk`.

        Parameters:
        - request: The incoming HTTP request.
        - pk: Primary key of the project for which to retrieve statistics.

        Returns:
        - Response object containing serialized project progress data or errors.
        """
        try:
            project = Project.objects.get(pk=pk)
            annotations = Annotation.objects.filter(project=project, was_cancelled=False)
            tasks = Task.objects.filter(project=project)
            total_annotations = annotations.count() if annotations else 0
            remaining_tasks = tasks.count() - total_annotations
            skipped_tasks = tasks.filter(annotations__was_cancelled=True).count()
            if tasks.count() > 0:
                progress_percentage = (total_annotations / tasks.count()) * 100
            else:
                progress_percentage = 0  # To avoid division by zero when no tasks exist.
            in_review = annotations.filter(review_status__isnull=True).count()
            approved = annotations.filter(review_status='Accept').count()
            rejected = annotations.filter(review_status='Reject').count()
            reviewd = annotations.filter(review_status__isnull=False).count()
            review_progress = (reviewd / total_annotations) * 100 if total_annotations > 0 else 0

            overview = {
                'to_label': remaining_tasks,
                'annotated': total_annotations,
                'skipped_tasks': skipped_tasks,
                'in_review': in_review,
                'approved': approved,
                'rejected':rejected,
                'review_progress': review_progress,
            }

            data = {
                'total_tasks': tasks.count(),
                'overall_progress': progress_percentage,
                'completed_task': total_annotations,
                'in_progress': remaining_tasks,
                'skipped_tasks': skipped_tasks,
                'overview_task': overview
                # 'label_distribution': label_distribution,
            }

            serializer = ProjectDashboardSerializer(data=data)
            if serializer.is_valid():
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

class ProjectPerformanceAPI(APIView):

    def get_month_annotated_data(self, annotations, start_date, end_date, date_range):
        x_axis = [date.strftime('%b') for date in date_range]
        annotated_counts = defaultdict(int)
        reviewed_counts = defaultdict(int)
        annotations_by_annotator = defaultdict(lambda: defaultdict(int))

        for annotation in annotations:
            # ... existing logic for completed_by, dates
            month = annotation.created_at.month
            r_month = annotation.updated_at.month
            if start_date.month <= month <= end_date.month:
                annotated_counts[month] += 1
            if start_date.month <= r_month <= end_date.month:
                annotations_by_annotator[annotation.completed_by.username][
                    annotation.updated_at] += 1
                reviewed_counts[r_month] += 1
            if annotation.completed_by and start_date.month <= r_month <= end_date.month:
                annotations_by_annotator[annotation.completed_by.username][
                    r_month] += 1
        annotator_performance = {
            'x_axis': x_axis,
            'annotators': [
                {'name': username,
                 'data': [annotations_by_annotator[username][month] for month in
                          range(start_date.month, end_date.month + 1)]}
                for username in annotations_by_annotator.keys()
            ]
        }

        task_performance = {
            'x_axis': x_axis,
            'annotated': [annotated_counts[month] for month in
                          range(start_date.month, end_date.month + 1)],
            'reviewed': [reviewed_counts[month] for month in
                         range(start_date.month, end_date.month + 1)],
        }
        return task_performance, annotator_performance

    def get_year_data(self, annotations, start_date, end_date, date_range):
        x_axis = [str(year) for year in
                  range(start_date.year, end_date.year + 1)]

        annotated_counts = defaultdict(int)
        reviewed_counts = defaultdict(int)
        annotations_by_annotator = defaultdict(lambda: defaultdict(int))

        for annotation in annotations:
            year = annotation.created_at.year
            r_year = annotation.updated_at.year
            if start_date.year <= year <= end_date.year:
                annotated_counts[year] += 1
            if start_date.year <= r_year <= end_date.year:
                annotations_by_annotator[annotation.completed_by.username][annotation.updated_at] += 1
                reviewed_counts[r_year] += 1
            if annotation.completed_by and start_date.year <= r_year <= end_date.year:
                annotations_by_annotator[annotation.completed_by.username][
                    r_year] += 1
        annotator_performance = {
            'x_axis': x_axis,
            'annotators': [
                {'name': username,
                 'data': [annotations_by_annotator[username][year] for year in
                          range(start_date.year, end_date.year + 1)]}
                for username in annotations_by_annotator.keys()
            ]
        }

        task_performance = {
            'x_axis': x_axis,
            'annotated': [annotated_counts[year] for year in
                          range(start_date.year, end_date.year + 1)],
            'reviewed': [reviewed_counts[year] for year in
                         range(start_date.year, end_date.year + 1)],
        }
        return task_performance, annotator_performance

    def get(self, request, pk):
        # Fetching all annotations for a given project
        annotations = Annotation.objects.filter(project_id=pk)
        # Calculate total time taken for the project
        total_time = annotations.aggregate(total=Sum('lead_time'))['total']
        total_time = total_time if total_time is not None else 0
        total_time_in_hour = round(total_time / 3600, 2)
        # Calculate average lead time
        average_lead_time = \
            annotations.aggregate(average=Avg('lead_time'))[
                'average']
        average_lead_time = average_lead_time if average_lead_time is not None else 0
        average_lead_time_in_min = round(average_lead_time / 60)
        # Calculate average annotation time per label
        average_time_per_label = annotations.values(
            label=F('result__label')).annotate(
            avg_lead_time=Avg('lead_time')
        )
        average_time_per_label = [round(item['avg_lead_time'] / 60, 2)
                                  for item in average_time_per_label]
        average_time_per_label = float(average_time_per_label[0]) if average_time_per_label else 0
        date_range_type = request.query_params.get('range')
        now = timezone.now()
        if date_range_type == 'custom':
            start_date_str = request.query_params.get('start')
            end_date_str = request.query_params.get('end')
            if start_date_str and end_date_str:
                start_date = datetime.fromisoformat(start_date_str).date()
                end_date = datetime.fromisoformat(end_date_str).date()
            else:
                end_date = now.date()
                start_date = end_date - timedelta(days=7)
            date_range = [start_date + timedelta(days=i) for i in
                          range((end_date - start_date).days + 1)]
            x_axis = [date.strftime('%b %d') for date in date_range]

        elif date_range_type == 'month':
            start_date = datetime(now.year, 1, 1).date()
            end_date = now.date()
            date_range = [datetime(now.year, month, 1).date() for month in
                          range(1, now.month + 1)]
            x_axis = [date.strftime('%b') for date in date_range]
            response_data, annotator_performance = self.get_month_annotated_data(
                annotations, start_date, end_date, date_range)
        elif date_range_type == 'year':
            start_date = datetime(now.year - 4, 1, 1).date()
            end_date = now.date()
            date_range = [datetime(year, 1, 1).date() for year in
                          range(now.year - 4, now.year + 1)]
            x_axis = [date.strftime('%Y') for date in date_range]
            response_data, annotator_performance = self.get_year_data(annotations, start_date, end_date, date_range)

        elif date_range_type == 'week':
            end_date = now.date()
            start_date = end_date - timedelta(weeks=5)
            date_range = [start_date + timedelta(weeks=i) for i in range(6)]
            x_axis = [f'Week {i + 1}' for i in range(6)]
            response_data, annotator_performance = self.get_week_data(
                annotations, start_date)
        else:
            end_date = now.date()
            start_date = end_date - timedelta(days=7)
            date_range = [start_date + timedelta(days=i) for i in range(8)]
            x_axis = [date.strftime('%b %d') for date in date_range]

        annotations_by_annotator = defaultdict(lambda: defaultdict(int))
        annotated_counts = defaultdict(int)
        reviewed_counts = defaultdict(int)
        label_counts = defaultdict(int)
        label_times = defaultdict(float)
        total_annotations = 0
        if date_range_type not in ['year', 'week', 'month']:
            for annotation in annotations:
                completed_by = annotation.completed_by
                updated_at = annotation.created_at.date()
                created_date = annotation.created_at.date()
                updated_date = annotation.updated_at.date()
                if start_date <= created_date <= end_date:
                    annotated_counts[created_date] += 1
                if start_date <= updated_date <= end_date:
                    reviewed_counts[updated_date] += 1
                if completed_by and start_date <= updated_at <= end_date:
                    annotations_by_annotator[completed_by.username][updated_at] += 1
            annotators_data = []

            for username, date_counts in annotations_by_annotator.items():
                data = [date_counts.get(date, 0) for date in date_range]
                annotators_data.append({
                    'name': username,
                    'data': data
                })
            annotator_performance = {
                'x_axis': x_axis,
                'annotators': annotators_data,
            }
            # Prepare the annotated and reviewed data lists
            annotated_data = [annotated_counts[date] for date in date_range]
            reviewed_data = [reviewed_counts[date] for date in date_range]

            # Construct the final response data
            response_data = {
                'x_axis': x_axis,
                'annotated': annotated_data,
                'reviewed': reviewed_data,
            }
        for annotation in annotations:
            result = annotation.result
            lead_time = annotation.lead_time if annotation.lead_time else 0
            for entry in result:
                total_annotations += 1
                annote_type = entry['type']
                label = entry['value'][annote_type][
                    0]
                label_counts[label] += 1
                label_times[label] += lead_time
        label_distribution = [
            {
                'name': label,
                'count': count,
                'label_share': round((count / total_annotations) * 100, 2)
            }
            for label, count in label_counts.items()
        ]

        data = {
            'total_lead_time': total_time_in_hour,
            'average_lead_time': average_lead_time_in_min,
            'average_time_per_label': average_time_per_label,
            'annotator_performance': annotator_performance,
            'task_performance': response_data,
            'label_distribution': label_distribution,
        }
        serializer = ProjectPerformanceSerializer(data=data)
        if serializer.is_valid():
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def get_week_data(self, annotations, start_date):
        # Calculate the first day of each week
        start_date -= timedelta(days=start_date.weekday())

        # Calculate the first day of each week
        x_axis = [(start_date + timedelta(days=7 * i)).strftime('%b %d') for i
                  in range(6)]

        annotated_counts = defaultdict(int)
        reviewed_counts = defaultdict(int)
        annotations_by_annotator = defaultdict(lambda: defaultdict(int))

        for annotation in annotations:
            annotation_week = (annotation.created_at.date() - start_date).days // 7
            r_week = (annotation.updated_at.date() - start_date).days // 7
            if 0 <= annotation_week < 6:
                annotated_counts[annotation_week] += 1
            if 0 <= r_week < 6:
                reviewed_counts[r_week] += 1
            if annotation.completed_by and 0 <= r_week < 6:
                annotations_by_annotator[annotation.completed_by.username][
                    r_week] += 1

        annotator_performance = {
            'x_axis': x_axis,
            'annotators': [
                {
                    'name': username,
                    'data': [annotations_by_annotator[username][week] for week
                             in range(6)]
                }
                for username in annotations_by_annotator.keys()
            ]
        }

        task_performance = {
            'x_axis': x_axis,
            'annotated': [annotated_counts[week] for week in range(6)],
            'reviewed': [reviewed_counts[week] for week in range(6)],
        }
        return task_performance, annotator_performance
