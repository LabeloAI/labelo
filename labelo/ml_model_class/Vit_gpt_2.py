try:
    from transformers import VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer
    import torch
    from PIL import Image
except ImportError:
    VisionEncoderDecoderModel = None
    ViTImageProcessor = None
    AutoTokenizer = None
    torch = None
    Image = None

from notifications.models import Notifications
import subprocess


class VitGpt2:
    def __init__(self):
        if VisionEncoderDecoderModel is None or ViTImageProcessor is None or AutoTokenizer is None:
            raise ImportError("Required packages are not installed. Please install them and restart the terminal.")
        
        self.model = VisionEncoderDecoderModel.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        self.feature_extractor = ViTImageProcessor.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        self.tokenizer = AutoTokenizer.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.config = {
            "max_length": 50,
            "num_beams": 4
        }

    def generate_desc_with_path(self, path):
        i_image = Image.open(path)
        if i_image.mode != "RGB":
            i_image = i_image.convert(mode="RGB")
        pixel_values = self.feature_extractor(images=[i_image], return_tensors="pt").pixel_values
        pixel_values = pixel_values.to(self.device)
        output_ids = self.model.generate(pixel_values, **self.config)
        preds = self.tokenizer.batch_decode(output_ids, skip_special_tokens=True)
        return preds[0].strip()

    @classmethod
    def install(cls, user):
        Notifications.create_notification(
            users=[user],
            content="Started to download packages and models needed for Vit Gpt2.",
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
                    content="Vit Gpt2 downloading has failed.",
                    title="Download Failed"
                )
                return  # Exit the method after failure

        # Notify the user to restart the terminal
        # Notifications.create_notification(
        #     users=[user],
        #     content="Installation complete! Please restart your terminal to use the package.",
        #     title="Installation Complete"
        # )

        # Check if the imports now work
        try:
            global VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer
            from transformers import VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer
            # If successful, load the models
            cls.model = VisionEncoderDecoderModel.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
            cls.feature_extractor = ViTImageProcessor.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
            cls.tokenizer = AutoTokenizer.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
            Notifications.create_notification(
                users=[user],
                content="Vit Gpt2 is downloaded and ready.",
                title="Downloaded"
            )
        except ImportError:
            Notifications.create_notification(
                users=[user],
                content="Vit Gpt2 downloading has failed. Please ensure the packages are installed and restart your terminal.",
                title="Download Failed"
            )
