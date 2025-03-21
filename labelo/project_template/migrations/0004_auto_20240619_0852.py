# Generated by Django 3.2.25 on 2024-06-19 08:52

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0009_alter_organization_created_by'),
        ('project_template', '0003_remove_projecttemplate_organization'),
    ]

    operations = [
        migrations.AddField(
            model_name='projecttemplate',
            name='color',
            field=models.CharField(blank=True, max_length=7),
        ),
        migrations.AddField(
            model_name='projecttemplate',
            name='expert_instruction',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='projecttemplate',
            name='label_config',
            field=models.TextField(blank=True, default='<View></View>', null=True, verbose_name='label config'),
        ),
        migrations.AddField(
            model_name='projecttemplate',
            name='organization',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='projects_template', to='organizations.organization'),
        ),
        migrations.AddField(
            model_name='projecttemplate',
            name='sampling',
            field=models.CharField(default='uniform', max_length=50),
        ),
        migrations.AddField(
            model_name='projecttemplate',
            name='show_instruction',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='projecttemplate',
            name='show_skip_button',
            field=models.BooleanField(default=True),
        ),
    ]
