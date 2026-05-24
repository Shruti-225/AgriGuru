from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ...existing code...

@app.route("/market", methods=["GET"])
def market_advisory():
    return jsonify({
        "advisory": "Market advisory for farmers: sell wheat and rice when demand is strong; hold vegetables for a short period if storage is available.",
        "items": [
            {"crop": "Wheat", "price": "₹2200/quintal", "trend": "stable"},
            {"crop": "Rice", "price": "₹2500/quintal", "trend": "up"},
            {"crop": "Mustard", "price": "₹4800/quintal", "trend": "down"}
        ]
    })

# ...existing code...