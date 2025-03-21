# Generated by Django 3.2.25 on 2024-06-28 06:18

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0053_taskassignee_compleated'),
    ]

    operations = [
        migrations.AlterField(
            model_name='review',
            name='reviewer',
            field=models.ForeignKey(help_text='Task assignee with type "RV" who reviewed the task', on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='tasks.taskassignee'),
        ),
    ]
