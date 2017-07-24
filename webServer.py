import http.server
import socketserver
import socket;
PORT = 3000

Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), Handler)
HOST = socket.gethostbyname(socket.gethostname());

print ("serving at port", str(HOST)+":"+ str(PORT))
httpd.serve_forever()

'''import sys  
import http.server
from http.server import SimpleHTTPRequestHandler  
HandlerClass = SimpleHTTPRequestHandler  
ServerClass  = http.server.HTTPServer  
Protocol     = "HTTP/1.0"  
  
port = 3000  
import socket  
hostname = socket.gethostbyname(socket.gethostname())  
server_address = (hostname, port)  
  
HandlerClass.protocol_version = Protocol  
httpd = ServerClass(server_address, HandlerClass)  
  
sa = httpd.socket.getsockname()  
print ("Serving HTTP on", str(sa[0]) + ":" + str(sa[1]), "..." )

httpd.serve_forever() '''
