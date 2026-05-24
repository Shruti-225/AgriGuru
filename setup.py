from setuptools import setup, find_packages

setup(
    name='agri_guru_backend',
    version='0.1.0',
    author='Your Name',
    author_email='your.email@example.com',
    description='Backend for the Agriguru application',
    packages=find_packages(include=['app', 'app.*']),
    install_requires=[
        'Flask',  # or 'FastAPI' depending on your choice
        'SQLAlchemy',
        'pydantic',
        'requests',
        'pytest',
        # Add other dependencies as needed
    ],
    classifiers=[
        'Programming Language :: Python :: 3',
        'Framework :: Flask',  # or 'Framework :: FastAPI'
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.7',
)