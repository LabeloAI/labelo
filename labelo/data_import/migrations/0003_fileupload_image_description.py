# Generated by Django 3.2.25 on 2024-07-10 09:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_import', '0002_alter_fileupload_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='fileupload',
            name='image_description',
            field=models.TextField(default='', null=True),
        ),
    ]