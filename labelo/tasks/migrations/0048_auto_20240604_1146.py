# Generated by Django 3.2.25 on 2024-06-04 11:46

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0028_alter_project_workspace'),
        ('tasks', '0047_merge_20240318_2210'),
    ]

    operations = [
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('was_accepted', models.BooleanField(default=False, help_text='User has accepted the annotation', verbose_name='was accepted')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Time when the review was created', verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Last time when the review was updated', verbose_name='updated at')),
                ('project', models.ForeignKey(help_text='Project ID for this review', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='projects.project')),
                ('reviewer', models.ForeignKey(help_text='User who reviewed the task', on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to=settings.AUTH_USER_MODEL)),
                ('task', models.ForeignKey(help_text='Task being reviewed', on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='tasks.task')),
            ],
            options={
                'db_table': 'task_review',
            },
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['task'], name='task_review_task_id_7196ff_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['reviewer'], name='task_review_reviewe_baebfd_idx'),
        ),
    ]
