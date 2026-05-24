# Agriguru Backend

## Overview
Agriguru is a backend application designed to manage agricultural products and user authentication. This project is built using [FastAPI/Flask] and follows a modular architecture for better maintainability and scalability.

## Project Structure
```
agri_guru_backend
├── app
│   ├── __init__.py
│   ├── main.py
│   ├── api
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── dependencies.py
│   ├── core
│   │   ├── config.py
│   │   └── security.py
│   ├── models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── product.py
│   ├── services
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   └── product_service.py
│   └── db
│       ├── __init__.py
│       ├── base.py
│       └── session.py
├── tests
│   ├── __init__.py
│   ├── test_api.py
│   └── test_services.py
├── .gitignore
├── README.md
├── requirements.txt
└── setup.py
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd agri_guru_backend
   ```
3. Create a virtual environment:
   ```
   python -m venv .venv
   ```
4. Activate the virtual environment:
   - On Windows:
     ```
     .venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source .venv/bin/activate
     ```
5. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage
To run the application, execute the following command:
```
python -m app.main
```

## Testing
To run the tests, use:
```
pytest
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.