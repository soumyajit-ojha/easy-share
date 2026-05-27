from fastapi import FastAPI, Response


app = FastAPI()

@app.get("/")
async def home():
    return(
        {
            "message":"Testing successfully"
        }
    )