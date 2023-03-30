# Compute Example JavaScript JSON Web Tokens

This is a demo of JWT (JSON Web Token) support within the Compute JavaScript SDK.

The application has several routes, the relevant routes for this demo are:
- `/authenticated`:
    - If the client does have a valid JWT signed by the applications private key, then the application responds with JSON which contains the JWT Claims Set
    - If the client does *not* have a valid JWT signed by the applications private key, then the application responds with HTML containing a link to the login page
- `/login`:
    - A HTML page containing a form to login. Any credentials will work, the provided email address will be added into the JWT Claims Set which is sent back as a Cookie.
- `/logout`:
    - The application sends a Clear-Site-Data header to removes all cookies from the client and redirects the client back to the `/login` page.

The application is hosted at `https://js-jwt.edgecompute.app/`
