# -*- coding: utf-8 -*-
# Generated by Django 1.11.28 on 2020-02-13 18:54
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('seqr', '0005_locuslist_projects'),
    ]

    operations = [
        migrations.AddField(
            model_name='family',
            name='mme_notes',
            field=models.TextField(blank=True, null=True),
        ),
    ]
