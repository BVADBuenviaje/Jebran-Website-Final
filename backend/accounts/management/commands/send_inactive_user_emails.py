from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from accounts.models import User

class Command(BaseCommand):
    help = "Send email to users who have not been active for over 4 months"

    def handle(self, *args, **kwargs):
        four_months_ago = timezone.now() - timezone.timedelta(days=120)
        inactive_users = User.objects.filter(last_active__lt=four_months_ago, is_blocked=False)
        for user in inactive_users:
            if user.email:
                subject = "We Miss You at Jebran!"
                message = (
                    f"Hello {user.full_name or user.username},\n\n"
                    "You have not been active for over 4 months. The Jebran family misses you!\n"
                    "Log in to see what's new and order your favorite noodles.\n\n"
                    "Best regards,\nJebran Team"
                )
                send_mail(subject, message, None, [user.email])
                self.stdout.write(self.style.SUCCESS(f"Sent email to {user.email}"))