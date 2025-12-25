import sounddevice as sd

print("Index | In | Out | HostAPI | Name")
print("-"*80)
devs = sd.query_devices()
apis = sd.query_hostapis()
for i, d in enumerate(devs):
    host = apis[d["hostapi"]]["name"]
    print(f"{i:>5} | {d['max_input_channels']:>2} | {d['max_output_channels']:>3} | {host:<7} | {d['name']}")
