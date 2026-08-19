from fastapi import Request


def get_database(request: Request):
    return request.app.state.database


def get_destination_collection(request: Request):
    database = get_database(request)

    return database["destinations"]
