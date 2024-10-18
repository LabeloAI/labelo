from .Blip import Blip
from .Vit_gpt_2 import VitGpt2
from .Gpt4Vison import Gpt4Vision


MODELS = {
    "vit": {
        "name": "Vit Gpt2",
        "model": VitGpt2,
        "args": {},
        "key": "vit_gp2"
    },
    "blip": {
        "name": "Salesforce Blip",
        "model": Blip,
        "args": {},
        "key": "salesforce_blip"
    },
    "vision": {
        "name": "Gpt4 Vision",
        "model": Gpt4Vision,
        "args": {
            "vision_api_key": "OpenAI Api key"
        },
        "key": "openai_gpt4_vision"
    },
}

# TODO SceneXplain, Gemini, Claude 3, Blip 2


def get_model(key):
    return MODELS[key]
