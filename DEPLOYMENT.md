# 배포 정보

## 서버 정보
- **서버 IP**: 115.68.195.125
- **도메인**: typeanswer.monemusic.com
- **SSH 접속**: `ssh -i ~/monemusic root@115.68.195.125`
- **Docker 이미지**: amuguona/typeform:latest
- **컨테이너 이름**: typeform-app

## 환경변수

### 필수 환경변수
```bash
RAILS_MASTER_KEY=562c2a376a6d14c782045902d784589a
RAILS_ENV=production
SOLID_QUEUE_IN_PUMA=true
```

## 배포 명령어

### 전체 배포 (한 번에 실행)
```bash
# 1. Docker Hub 로그인
docker login -u amuguona
# 패스워드는 별도 관리 (Docker Hub Access Token)

# 2. 빌드, 푸시, 배포
docker build -t amuguona/typeform:latest . && \
docker push amuguona/typeform:latest && \
ssh -i ~/monemusic root@115.68.195.125 "docker stop typeform-app 2>/dev/null || true; docker rm typeform-app 2>/dev/null || true; docker pull amuguona/typeform:latest; docker run -d --name typeform-app --network kamal -v typeform_storage:/rails/storage -e RAILS_MASTER_KEY=562c2a376a6d14c782045902d784589a -e RAILS_ENV=production -e SOLID_QUEUE_IN_PUMA=true amuguona/typeform:latest && docker exec kamal-proxy kamal-proxy deploy typeform-app --target 'typeform-app:80' --host 'typeanswer.monemusic.com' --tls"
```

## 단계별 배포

### 1. 로컬에서 코드 준비
```bash
# 변경사항 커밋 및 푸시
git add .
git commit -m "Update: 배포 준비"
git push origin main
```

### 2. Docker 이미지 빌드 및 푸시
```bash
# Docker Hub 로그인
docker login -u amuguona
# 패스워드는 별도 관리 (Docker Hub Access Token 사용)

# 이미지 빌드
docker build -t amuguona/typeform:latest .

# 이미지 푸시
docker push amuguona/typeform:latest
```

### 3. 서버에서 배포
```bash
# 서버 접속
ssh -i ~/monemusic root@115.68.195.125

# 기존 컨테이너 중지 및 삭제
docker stop typeform-app 2>/dev/null || true
docker rm typeform-app 2>/dev/null || true

# 최신 이미지 pull
docker pull amuguona/typeform:latest

# 컨테이너 실행
docker run -d \
  --name typeform-app \
  --network kamal \
  -v typeform_storage:/rails/storage \
  -e RAILS_MASTER_KEY=562c2a376a6d14c782045902d784589a \
  -e RAILS_ENV=production \
  -e SOLID_QUEUE_IN_PUMA=true \
  amuguona/typeform:latest

# Kamal 프록시에 등록
docker exec kamal-proxy kamal-proxy deploy typeform-app --target "typeform-app:80" --host "typeanswer.monemusic.com" --tls
```

### 4. 마이그레이션 실행 (필요시)
```bash
# 서버에서
docker exec typeform-app /rails/bin/rails db:migrate RAILS_ENV=production
```

### 5. 로그 확인
```bash
# 실시간 로그
docker logs -f typeform-app --tail 50

# 전체 로그
docker logs typeform-app
```

## 배포 순서 체크리스트

- [ ] 1. 로컬에서 변경사항 커밋 및 푸시
- [ ] 2. Docker 이미지 빌드
- [ ] 3. Docker Hub에 푸시
- [ ] 4. 서버에서 기존 컨테이너 중지/삭제
- [ ] 5. 최신 이미지 pull
- [ ] 6. 새 컨테이너 실행
- [ ] 7. 마이그레이션 실행 (필요시)
- [ ] 8. 로그 확인 및 헬스체크

## 데이터베이스 마이그레이션

### 마이그레이션 실행 전 체크
```bash
# 서버에서 백업 (중요!)
ssh -i ~/monemusic root@115.68.195.125
docker exec typeform-app /rails/bin/rails db:schema:dump RAILS_ENV=production
```

### 마이그레이션 목록
- `20251212115459_create_analytics_events.rb` - analytics_events 테이블 생성

### 마이그레이션 실행
```bash
docker exec typeform-app /rails/bin/rails db:migrate RAILS_ENV=production
```

## SSL 인증서 (Let's Encrypt)

Kamal 프록시가 자동으로 Let's Encrypt 인증서를 발급합니다.
- 도메인: typeanswer.monemusic.com
- 자동 갱신: Kamal이 관리

## 트러블슈팅

### 컨테이너가 시작되지 않을 때
```bash
# 로그 확인
docker logs typeform-app

# 컨테이너 상태 확인
docker ps -a | grep typeform

# 강제 재시작
docker restart typeform-app
```

### 데이터베이스 연결 오류
```bash
# 환경변수 확인
docker exec typeform-app env | grep RAILS

# 데이터베이스 파일 확인
docker exec typeform-app ls -la /rails/storage
```

### 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# 기존 프로세스 종료
kill <PID>
```

## 롤백 방법

### 이전 버전으로 롤백
```bash
# 특정 버전 태그로 배포
docker pull amuguona/typeform:previous-tag
docker stop typeform-app
docker rm typeform-app
docker run -d --name typeform-app [... 동일한 옵션 ...] amuguona/typeform:previous-tag
```

## 모니터링

### 서버 리소스 확인
```bash
# CPU, 메모리 사용량
docker stats typeform-app

# 디스크 사용량
df -h
```

### 애플리케이션 상태
```bash
# 헬스체크
curl https://typeanswer.monemusic.com

# 로그 확인
docker logs typeform-app --tail 100
```

## 백업

### 데이터베이스 백업
```bash
# SQLite 파일 백업
docker cp typeform-app:/rails/storage/production.sqlite3 ./backup-$(date +%Y%m%d).sqlite3
```

### 스토리지 백업
```bash
# 볼륨 백업
docker run --rm -v typeform_storage:/data -v $(pwd):/backup alpine tar czf /backup/storage-backup-$(date +%Y%m%d).tar.gz /data
```

## 추가 정보

- **Rails 버전**: 8.0.4
- **Ruby 버전**: 3.4.5
- **데이터베이스**: SQLite3
- **웹서버**: Puma + Thruster
- **특이사항**: Tidewave gem 포함
