from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Category(db.Model):
    """Modelo para categorias de histórias"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento com histórias
    stories = db.relationship('Story', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'

class Story(db.Model):
    """Modelo para histórias"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_shared = db.Column(db.Boolean, default=False)
    share_token = db.Column(db.String(64), unique=True)
    
    # Chave estrangeira para categoria
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    
    # Relacionamento com arquivos
    attachments = db.relationship('Attachment', backref='story', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Story {self.title}>'

class Attachment(db.Model):
    """Modelo para arquivos anexados às histórias"""
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50))  # Tipo de arquivo (imagem, documento, etc.)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Chave estrangeira para história
    story_id = db.Column(db.Integer, db.ForeignKey('story.id'), nullable=False)
    
    def __repr__(self):
        return f'<Attachment {self.filename}>'
