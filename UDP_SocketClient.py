import socket

print("Launching UDP client")

# this opens a port on the specified server

UDP_IP = input("Enter server IP address: ")
UDP_PORT = 5005
MESSAGE = ""

print("UDP target IP: %s" % UDP_IP)
print("UDP target port: %s" % UDP_PORT)


try:
    sock = socket.socket(socket.AF_INET,    # Internet 
                         socket.SOCK_DGRAM) # UDP

    # keep doing this until the user enters a ~ character
    while MESSAGE != "~":
        # get a string to send from the user
        MESSAGE = input("Message? ")
        msglen = len(MESSAGE)
        if (msglen > 0): # send the string one character at a time to test UDP reliability
            for x in range(msglen):
               sock.sendto(bytearray(MESSAGE[x],encoding="ascii"),
                        (UDP_IP, UDP_PORT))

            # make a note of what we sent and where   
            print("Message <",MESSAGE,"> sent to ",UDP_IP,":",UDP_PORT)
except:
    print("socket error")
