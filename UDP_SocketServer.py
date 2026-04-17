import socket

print ("Launching UDP server")

# get the name of the machine we are running on
host_name = socket.gethostname()

# get the IP address of the machine were are running on so we can open a port to UDP data
host_ip = socket.gethostbyname(host_name)

print("Hostname :  ", host_name)
print("IP : ", host_ip)
        
UDP_IP = host_ip
UDP_PORT = 5005
BUFFER_SIZE = 10

sock = socket.socket(socket.AF_INET, # Use IP v4
                     socket.SOCK_DGRAM) # use UDP datagrams
sock.bind((UDP_IP, UDP_PORT))

print("Listening on",UDP_IP,":",UDP_PORT)

a = ""

# keep doing this until the client sends a ~ character
while a != "~":
    try:
        data, addr = sock.recvfrom(BUFFER_SIZE)

        # convert bytearray into a string
        a = str(data)

        # remove the first 2 characters and last character
        a = a[2:-1]

        # print the character immediately and don't do a newline
        print(a,end="",flush=True)

        # print a newline and client communication data on if a . is received
        if ( a == "." ):
            print(" < from",addr,">")
    except:
        print("socket receive error")
