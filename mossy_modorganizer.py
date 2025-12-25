import pyttsx3
import speech_recognition as sr
import subprocess

engine = pyttsx3.init()
engine.setProperty('voice', engine.getProperty('voices')[1].id)  # Zira voice

recognizer = sr.Recognizer()

# Adjust sensitivity (lower value = more sensitive to quieter speech)
recognizer.energy_threshold = 200  # clearly placed here inside the script
recognizer.dynamic_energy_adjustment_ratio = 1.5

# Mod Organizer 2 installation path
MO2_PATH = r"G:\MO2\ModOrganizer.exe"

def speak(text):
    engine.say(text)
    engine.runAndWait()

def launch_mo2():
    try:
        subprocess.Popen(MO2_PATH)
        speak("Mod Organizer 2 is now opening.")
        print("Mod Organizer 2 is now opening.")
    except Exception as e:
        speak(f"Failed to open Mod Organizer 2. Error: {str(e)}")
        print(f"Failed to open Mod Organizer 2. Error: {str(e)}")

def listen_and_recognize():
    with sr.Microphone() as source:
        speak("Please speak your command clearly.")
        print("Calibrating to your room's background noise. Please wait...")
        recognizer.adjust_for_ambient_noise(source, duration=3)

        print("Mossy is carefully listening now...")
        try:
            audio = recognizer.listen(source, timeout=7, phrase_time_limit=12)
        except sr.WaitTimeoutError:
            speak("I did not hear anything. Please try again.")
            return ""

    try:
        text = recognizer.recognize_google(audio).lower()
        print(f"You clearly said: {text}")
        return text
    except sr.UnknownValueError:
        speak("Sorry, I didn't quite understand. Try again clearly.")
        return ""
    except sr.RequestError as e:
        speak(f"Recognition error: {e}")
        return ""

def process_command(command):
    if any(phrase in command for phrase in ["open mod organizer", "open mod organ", "open my organ", "open mod", "open mod manager"]):
        launch_mo2()
    elif "exit" in command or "quit" in command:
        speak("Goodbye!")
        exit()
    else:
        speak(f"You said: {command}. Ready for your next command.")

def chat():
    speak("Hi, Mossy here. I'm listening carefully now.")
    while True:
        user_input = listen_and_recognize()
        if user_input:
            process_command(user_input)

if __name__ == "__main__":
    chat()