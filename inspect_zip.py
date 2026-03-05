import zipfile, pathlib
zip_path = pathlib.Path('D:/Blender addon/fallout4_tutorial_helper-v2.1.2.zip')
with zipfile.ZipFile(zip_path) as zf:
    print('total entries', len(zf.infolist()))
    sizes = sorted((e.file_size for e in zf.infolist()), reverse=True)
    print('largest sizes', sizes[:5])
