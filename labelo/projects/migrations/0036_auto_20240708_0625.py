# Generated by Django 3.2.25 on 2024-07-08 06:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0035_project_review_distribution'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='review_instruction',
            field=models.TextField(blank=True, default='', help_text='Review instructions in HTML format', null=True, verbose_name='review instruction'),
        ),
        migrations.AddField(
            model_name='project',
            name='show_review_instruction',
            field=models.BooleanField(default=False, help_text='Show review instructions to the reviewer before they start', verbose_name='show review instruction'),
        ),
    ]