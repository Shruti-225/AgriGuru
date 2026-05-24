from app.models.product import Product
from app.db.session import db_session

def add_product(product_data):
    new_product = Product(**product_data)
    db_session.add(new_product)
    db_session.commit()
    return new_product

def update_product(product_id, product_data):
    product = db_session.query(Product).filter(Product.id == product_id).first()
    if product:
        for key, value in product_data.items():
            setattr(product, key, value)
        db_session.commit()
        return product
    return None

def get_product(product_id):
    return db_session.query(Product).filter(Product.id == product_id).first()

def get_all_products():
    return db_session.query(Product).all()

def delete_product(product_id):
    product = db_session.query(Product).filter(Product.id == product_id).first()
    if product:
        db_session.delete(product)
        db_session.commit()
        return True
    return False