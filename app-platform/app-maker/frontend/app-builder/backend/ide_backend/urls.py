from django.urls import path
from django.http import JsonResponse

def live_preview(request):
    return JsonResponse({"status": "Preview Running"})

urlpatterns = [path('preview/', live_preview)]
