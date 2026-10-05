from flask import Flask, render_template


app = Flask(__name__)


@app.route("/")
def home():
    return render_template("pages/home.html", active_page="home")


@app.route("/projects")
def projects():
    return render_template("pages/projects.html", active_page="projects")


@app.route("/projects/metadata")
def metadata():
    return render_template("pages/metadata.html", active_page="projects")


@app.route("/experience")
def experience():
    return render_template("pages/experience.html", active_page="experience")


@app.route("/blog")
def blog():
    return render_template("pages/blog.html", active_page="blog")


@app.route("/blog/<post>")
def post(post):
    return render_template("pages/post.html", active_page="blog", post_slug=post)


@app.route("/login")
def login():
    return render_template("pages/auth.html", active_page="auth")


if __name__ == "__main__":
    app.run(debug=True)
