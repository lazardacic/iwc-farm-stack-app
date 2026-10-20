from fastapi import Request


def get_database(request: Request):
    return request.app.state.database


def get_destination_collection(request: Request):
    database = get_database(request)

    return database["destinations"]


def get_user_collection(request: Request):
    database = get_database(request)

    return database["users"]


def get_upload_collection(request: Request):
    database = get_database(request)

    return database["uploads"]


def get_image_storage(request: Request):
    return request.app.state.image_storage


def get_refresh_token_collection(request: Request):
    database = get_database(request)

    return database["refresh_tokens"]
