import base64
import subprocess
import numpy as np
from openai import OpenAI

try:
    import cv2
    from PIL import Image
except ImportError:
    cv2 = None
    Image = None

from notifications.models import Notifications

class Gpt4Vision:
    def __init__(self, vision_api_key):
        self.client = OpenAI(api_key=vision_api_key)

    def generate_desc_with_path(self, path):
        if cv2 is None or Image is None:
            raise ImportError("Required packages are not installed. Please install them and restart the terminal.")
        
        image = np.asarray(Image.open(path))
        desc = self.gen_desc("Describe this image", image)
        return desc.message.content

    def gen_desc(self, prompt, image):
        def encode_to_base64():
            if isinstance(image, np.ndarray):
                success, encoded_image = cv2.imencode('.jpg', image)
                if not success:
                    raise ValueError("Could not encode image")
                return base64.b64encode(encoded_image).decode('utf-8')
        
        message_content = [
            {
                "type": "text",
                "text": prompt
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{encode_to_base64()}"
                }
            }
        ]
        response = self.client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[{"role": "user", "content": message_content}],
            max_tokens=300,
        )
        return response.choices[0]

    @classmethod
    def install(cls, user):
        Notifications.create_notification(
            users=[user],
            content="Started to download packages needed for Gpt4 Vision.",
            title="Downloading"
        )
        try:
            subprocess.run(['poetry', 'add', "opencv-python-headless"], check=True)
            subprocess.run(['poetry', 'add', "pillow"], check=True)
        except subprocess.CalledProcessError:
            try:
                subprocess.run(['pip3', 'install', "opencv-python-headless"], check=True)
                subprocess.run(['pip3', 'install', "pillow"], check=True)
            except subprocess.CalledProcessError:
                Notifications.create_notification(
                    users=[user],
                    content="Gpt4 Vision dependencies downloading has failed.",
                    title="Download Failed"
                )
                return  # Exit after failure

        # Notify the user to restart the terminal
        # Notifications.create_notification(
        #     users=[user],
        #     content="Installation complete! Please restart your terminal to use the Gpt4 Vision package.",
        #     title="Installation Complete"
        # )

        # Attempt to import the required packages again
        try:
            global cv2, Image
            import cv2
            from PIL import Image
            Notifications.create_notification(
                users=[user],
                content="Gpt4 Vision is downloaded and ready.",
                title="Downloaded"
            )
        except ImportError:
            Notifications.create_notification(
                users=[user],
                content="Gpt4 Vision downloading has failed. Please ensure the packages are installed and restart your terminal.",
                title="Download Failed"
            )
