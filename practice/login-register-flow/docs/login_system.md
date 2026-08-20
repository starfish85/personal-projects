# Registration and Login System

This project contains `login_system.py`, a Tkinter registration and login application with:

- Registration validation for username, password, confirmation, and email.
- bcrypt password hashing before the MySQL insert.
- Redis-based failed-attempt tracking and lockout after 3 failures.
- A 120-second account lock with a non-blocking countdown.
- A local `login_cache.json` file for the Remember Me option and automatic login.

The complete Mermaid flow diagram is available in:

- `docs/login_register_lock_flow.mmd`
- `docs/login_register_lock_flow.png`

The diagram uses red nodes for synchronous work on the Tkinter main thread, blue nodes for background asynchronous work, and separate branches for registration, login, Remember Me, and lockout.

## Run

Install the Python dependencies from `requirements.txt`, then make sure MySQL is available on port 3307 and Redis is available on port 6379. Run:

```text
python login_system.py
```
