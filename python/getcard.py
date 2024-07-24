import nfc
import json
from typing import cast

def on_connect(tag):
    result = {}
    # System codes
    sys_code_id = 0x809E  # System code for student ID
    sys_code_name = 0xFE00  # System code for name

    # Polling and setting system codes for student ID
    idm, pmm = tag.polling(system_code=sys_code_id)
    tag.idm, tag.pmm, tag.sys = idm, pmm, sys_code_id

    # Reading student ID
    try:
        service_code_id = 0x0209
        sc1 = nfc.tag.tt3.ServiceCode(service_code_id >> 6, service_code_id & 0x3F)
        bc1 = nfc.tag.tt3.BlockCode(0, access=0, service=0)
        id_data = cast(bytearray, tag.read_without_encryption([sc1], [bc1]))
        student_id = id_data[0:5].decode().rstrip("\x00")  # Decode and remove trailing NULL characters
        result["student_id"] = student_id
    except nfc.tag.tt3.Type3TagCommandError as e:
        result["error_student_id"] = str(e)

    # Polling and setting system codes for name
    idm, pmm = tag.polling(system_code=sys_code_name)
    tag.idm, tag.pmm, tag.sys = idm, pmm, sys_code_name

    # Reading name
    try:
        service_code_name = 0x1A8B
        sc2 = nfc.tag.tt3.ServiceCode(service_code_name >> 6, service_code_name & 0x3F)
        bc2 = nfc.tag.tt3.BlockCode(1, access=0, service=0)
        name_data = cast(bytearray, tag.read_without_encryption([sc2], [bc2]))
        name = name_data.decode("shift_jis").rstrip("\x00")  # Decode and remove trailing NULL characters
        result["name"] = name
    except nfc.tag.tt3.Type3TagCommandError as e:
        result["error_name"] = str(e)

    print(result)

with nfc.ContactlessFrontend("usb") as clf:
    clf.connect(rdwr={"on-connect": on_connect})
