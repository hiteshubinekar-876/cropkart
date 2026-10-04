from sqlmodel import SQLModel


# Generic message response schema
class Message(SQLModel):
    message: str
