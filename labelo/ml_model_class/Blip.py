try:
    from PIL import Image
    from transformers import BlipForConditionalGeneration, BlipProcessor
except ImportError:
    BlipForConditionalGeneration = None
    BlipProcessor = None

from notifications.models import Notifications
import subprocess

class Blip:
    def __init__(self):
        if BlipForConditionalGeneration is None or BlipProcessor is None:
            raise ImportError("Required packages are not installed. Please install them and restart the terminal.")
        
        self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
        self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")

    def generate_desc_with_path(self, path):
        raw_image = Image.open(path).convert('RGB')
        inputs = self.processor(raw_image, return_tensors="pt")
        out = self.model.generate(**inputs)
        return self.processor.decode(out[0], skip_special_tokens=True)

    @classmethod
    def install(cls, user):
        Notifications.create_notification(
            users=[user],
            content="Started to download packages and models needed for Blip.",
            title="Downloading"
        )
        try:
            subprocess.run(['poetry', 'add', "transformers"], check=True)
            subprocess.run(['poetry', 'add', "pillow"], check=True)
            subprocess.run(['poetry', 'add', "torch"], check=True)
        except subprocess.CalledProcessError:
            try:
                subprocess.run(['pip3', 'install', "transformers"], check=True)
                subprocess.run(['pip3', 'install', "pillow"], check=True)
                subprocess.run(['pip3', 'install', "torch"], check=True)
            except subprocess.CalledProcessError:
                Notifications.create_notification(
                    users=[user],
                    content="Blip downloading has failed.",
                    title="Download Failed"
                )
                return  # Exit the method after failure

        # After installation, notify the user to restart the terminal
        # Notifications.create_notification(
        #     users=[user],
        #     content="Installation complete! Please restart your terminal to use the package.",
        #     title="Installation Complete"
        # )

        # Check if the imports now work
        try:
            global BlipForConditionalGeneration, BlipProcessor
            from transformers import BlipForConditionalGeneration, BlipProcessor
            # If successful, load the models
            BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
            BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
            Notifications.create_notification(
                users=[user],
                content="Blip is downloaded and ready.",
                title="Downloaded"
            )
        except ImportError:
            Notifications.create_notification(
                users=[user],
                content="Blip downloading has failed. Please ensure the packages are installed and restart your terminal.",
                title="Download Failed"
            )
