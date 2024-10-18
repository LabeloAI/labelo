# Generated by Django 3.2.25 on 2024-06-19 07:13

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0009_alter_organization_created_by'),
        ('project_template', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='projecttemplate',
            name='organization',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='projects_template', to='organizations.organization'),
        ),
    ]
