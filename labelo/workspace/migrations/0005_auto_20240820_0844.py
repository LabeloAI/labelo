# Generated by Django 3.2.25 on 2024-08-20 08:44

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0004_workspacemember'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='workspacemember',
            name='reated_at',
        ),
        migrations.RemoveField(
            model_name='workspacemember',
            name='updated_at',
        ),
    ]