import socket


def get_local_ip_address() -> str:
    """
    Discovers the active interface IP address of the local machine.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # We don't need a real connection. This UDP handshakes outside
        # to determine the local machine's routing interface IP.
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
    except Exception as e:
        print("Exception on getting local IP.")
        print(str(e))
        ip_address = "127.0.0.1"
    finally:
        s.close()
    return ip_address
