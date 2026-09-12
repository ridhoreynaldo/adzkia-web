# Kepala proxy yang sama untuk setiap `location`. Dipisah supaya tidak ada
# satu blok pun yang diam-diam kehilangan salah satunya — yang paling mahal
# adalah X-Forwarded-For: tanpa itu, SELURUH peserta terlihat berasal dari
# 127.0.0.1, dan pembatas laju per-IP mana pun menjadi pembatas global yang
# memutus seluruh sekolah sekaligus.

proxy_http_version 1.1;
proxy_set_header Upgrade           $http_upgrade;
proxy_set_header Connection        "";
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;

proxy_connect_timeout 5s;
proxy_send_timeout    60s;
proxy_read_timeout    60s;
