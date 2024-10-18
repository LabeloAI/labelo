from django.shortcuts import render
from django.contrib.auth.decorators import login_required


# Create your views here.
@login_required
def project_dashboard(request, pk, sub_path):
    # print("dashboard......")
    return render(request, 'project_dashboard.html')
