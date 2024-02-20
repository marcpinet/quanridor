from flask import Flask, request
import subprocess

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    # You can add validation here to secure your endpoint
    subprocess.call(['~/deploy.sh'])
    return 'Success', 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
