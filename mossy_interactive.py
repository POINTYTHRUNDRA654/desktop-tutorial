import pyttsx3
import speech_recognition as sr

engine = pyttsx3.init()
voices = engine.getProperty('voices')

# Explicitly set Microsoft Zira Desktop
engine.setProperty('voice', voices[1].id)

recognizer = sr.Recognizer()

def listen_and_recognize():
    with sr.Microphone() as source:
        print("Mossy is listening...")
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio)
        print(f"You said: {text}")
        return text
    except sr.UnknownValueError:
        print("Sorry, I couldn't understand.")
        return None
    except sr.RequestError as e:
        print(f"Could not request results; {e}")
        return None

def speak(text):
    engine.say(text)
    engine.runAndWait()

def chat():
    speak("Hello! I'm Mossy, how can I assist you?")
    while True:
        user_input = listen_and_recognize()
        if user_input:
            if "exit" in user_input.lower():
                speak("Goodbye!")
                break
            else:
                response = f"You said: {user_input}. I'm ready to help further!"
                speak(response)

if __name__ == "__main__":
    chat()