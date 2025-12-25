import pyttsx3

engine = pyttsx3.init()
voices = engine.getProperty('voices')

# Set Microsoft Zira Desktop explicitly (Voice 1 from your test)
engine.setProperty('voice', voices[1].id)

def speak(text):
    engine.say(text)
    engine.runAndWait()

speak("Hello! I'm Mossy, using Microsoft Zira's voice.")