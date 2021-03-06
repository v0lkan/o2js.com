The Setup



As I promised [in the last post][newblog], I'll go into the details of the overall architecture of this site.

> Although the steps defined in this article is specific to my needs, it can be helpful in general too. We will cover concepts like **how to create a reverse proxy using IIS7**, **how to install and configure NGINX**, **how to configure virtualbox**, **how to do port forwarding to a local virtual machine**… and the like.

Let's begin by setting up **IIS**:

[newblog]: http://o2js.com/hello-node-js-blogging-world

### Configuring IIS7

Our goal will be to forward all the requests that come to **o2js.com** to a local port, hoping that there's somebody at that port listening to the requests.

So, the first thing is to open **IIS Manager**, and create a website with the following bindings:

[![IIS7 bindings][bindings]][bindingslarge]

And here's the **web.config** file in the site's root directory:

    <?xml version="1.0" encoding="UTF-8"?>
    <configuration>
        <system.web>
            <sessionState mode="Off" />
        </system.web>
        <system.webServer>
            <rewrite>
                <rules>
                    <rule name="ReverseProxyInboundRule1" stopProcessing="true">
                        <match url="(.*)" />
                        <action type="Rewrite" url="http://localhost:8001/{R:1}" />
                    </rule>
                </rules>
            </rewrite>
        </system.webServer>
    </configuration>


This site will simply act as a proxy, forwarding any request that comes to it to **localhost:8001**.

> I have also **blocked external access to port 8001** using **windows firewall**. Since the forwarding is done to a local address only, the outside world does not need to access port 8001.

That's all for the **IIS** part. The next thing is to set up the *virtual machine*:

[bindings]:       http://o2js.com/assets/bindings.png
[bindingslarge]:  http://o2js.com/assets/bindings_large.png

### Configuring VirtualBox

[VirtualBox][virtualbox] is a powerful **x86** and **AMD64/Intel64** [virtualization][virt] product. I am running an [64 bit ubuntu virtual machine][ubuntu] inside the virtualbox that I've installed to my windows server.

[![virtualbox][virtualbox-screen]][virtualbox-large]

[Installing an operating system into virtualbox][howtoinstall] is pretty straightforward.

After installing the OS (*which is **ubuntu** in my case*), I defined the following **[NAT][nat-define]** rules:

[![NAT rules][nat]][nat-large]

Here's what I do with these ports:

* I occasionally run **[scotch][scotch]** on **port 8000** to create static files of this blog (*more on that later*).
* I am forwarding **port 22** to **SSH** to this virtual machine from outside.
* I am forwarding **port 8001** so that any request to *port 8001* of the *host machine* directly goes to this virtual server (i.e. the *guest machine*) – This sets the receiving endpoint of the redirect rule that we've set up in the **web.config** above.

The next thing is setting up **NGINX**:


[virtualbox]:        https://www.virtualbox.org/
[virt]:              http://en.wikipedia.org/wiki/Virtualization
[ubuntu]:            http://www.ubuntu.com/desktop
[virtualbox-screen]: http://o2js.com/assets/virtualbox.png
[virtualbox-large]:  http://o2js.com/assets/virtualbox_large.png
[howtoinstall]:      http://www.wikihow.com/Install-Ubuntu-on-VirtualBox
[nat]:               http://o2js.com/assets/nat.png
[nat-large]:         http://o2js.com/assets/nat_large.png
[nat-define]:        https://en.wikipedia.org/wiki/Network_address_translation
[scotch]:            https://github.com/techwraith/scotch

### SSH

After forwarding ports, we can **SSH** to the virtual server via `ssh -l {username} -p 22 {serverip}` command.

Here's how the server looks like right now:

[![htop][server]][server-large]

Not bad for a virtual server, huh **;)**?

### Configuring NGINX

Installing **[NGINX][nginx]** is as easy as running `sudo apt-get install nginx`.

After installing **NGINX**, I've created this **nginx.conf**:

    user www-data;
    worker_processes 4;
    pid /run/nginx.pid;
    
    events {
      worker_connections 768;
    }
    
    http {
      sendfile on;
      tcp_nopush on;
      tcp_nodelay on;
      keepalive_timeout 65;
      types_hash_max_size 2048;
    
      include /etc/nginx/mime.types;
      default_type application/octet-stream;

      access_log /var/log/nginx/access.log;
      error_log /var/log/nginx/error.log;

      gzip on;
      gzip_disable "msie6";
    
      include /etc/nginx/conf.d/*.conf;
      include /etc/nginx/sites-enabled/*;
    
        server {
            listen          8001;
            server_name     o2js.com;
            access_log      logs/o2js.com.access.log;
            root            /home/volkan/PROJECTS/o2js.com/server/blog/static;
    
            # rewrite_log on;
            rewrite ^/$           /index.html;
            rewrite ^([^.]+)$     $1.html;
        }
    }

This is the most basic configuration file that you can start with.

The rewrite rules

    rewrite ^/$           /index.html;
    rewrite ^([^.]+)$     $1.html;

are there to map **o2js.com/article_goes_here.html** links to **o2js.com/article_goes_here** (*without the *.html* extension), which is cleaner.

And we haven't created */home/volkan/PROJECTS/o2js.com/server/blog/static* folder yet. That's the next thing we'll do:

[server]:       http://o2js.com/assets/server.png
[server-large]: http://o2js.com/assets/server_large.png
[nginx]:        http://nginx.org

### Creating the Project Folder

The source code of this blog (*along with markdown versions of all of the articles in it*) [can be cloned at github][o2bloggit].

    $: cd /home/volkan/PROJECTS/
    $: git clone https://github.com/v0lkan/o2js.com.git

### Installing Scotch

[Scotch][scotch] is a dead-simple, [markdown][markdown]-based blogging framework for [node.js][nodejs].

Installing **scotch** is really easy:

    $: cd /home/volkan/PROJECTS/o2js.com/
    $: npm install -g scotch-blog
    $: cd blog
    $: sudo scotch serve 8080

Then going to *http://localhost:8080/dashboard/install* will install **scotch** for you.

> Make sure that you have **[MongoDB][mongo]** installed, before installing **scotch**.

[o2bloggit]: https://github.com/v0lkan/o2js.com
[markdown]:  http://daringfireball.net/projects/markdown/
[nodejs]:    http://nodejs.org/
[mongo]:     http://www.mongodb.org/

### Generating Static Blog Content

This is also as easy as calling `scotch generate` in the blog folder.

This will create a static copy of the site under a folder named **static*.

### That's It

In this post, I tried to share…

* How I set up a minimalist **node.js** blog;
* How I created a **static** version of that blog;
* How I served this static content through **NGINX**;
* And how I **reverse-proxied** to that blog through **IIS**.

The end result of all this effort is this very blog that you're reading right now **;)**.

> Whenever I write a new blog article, I also create a markdown file for it.<br>
> I synchronize these markdown files and other static content with the [blog's github repository][o2jscomgit].

Which also means that when I do a change, I'm updating the master branch, and publishing my updates on the master branch immediately.
– There's no dev branch; there's no staging…

![Testing on Production Meme][prod]

I like living dangerously **;)**.

One other thing before I forget: [there are a bunch of issues that I've opened already][issues], to enhance this blog's functionality further. [As I've said earlier][earlier], this is a very long transition project. And if you have any ideas, I'd love to learn about them.

[o2jscomgit]: https://github.com/v0lkan/o2js.com
[prod]:       http://o2js.com/assets/prod.png
[earlier]:    http://o2js.com/hello-node-js-blogging-world
[issues]:     https://github.com/v0lkan/o2js.com/issues