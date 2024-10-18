# Generated by Django 3.2.25 on 2024-06-28 05:11

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0053_taskassignee_compleated'),
    ]

    operations = [
        migrations.AddField(
            model_name='taskassignee',
            name='annotation_completed',
            field=models.ForeignKey(blank=True, help_text='Corresponding compleated annotation for Task assign', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='assignee', to='tasks.annotation'),
        ),
    ]