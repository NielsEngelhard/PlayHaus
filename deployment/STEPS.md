Steps to undertake for full deployment

Generate SSH key
```
ssh-keygen -t ed25519 -C "playhaus-ci" -f "$env:USERPROFILE\.ssh\playhaus_ci"
```

Copy SSH key to clipboard
```
Get-Content "$env:USERPROFILE\.ssh\playhaus_ci" -Raw | Set-Clipboard
```

1. Create deployment/terraform/terraform.tfvars based on terraform.tfvars.example and fill in all values
2. terraform init && terraform apply (in ./deployment/terraform)
3. Create A record pointing to server IP for host address
    - A 206.189.104.116 @   300
    - A 206.189.104.116 www 300
4. GitHub secrets:
    - DEPLOY_HOST (reserved IP)
    - DEPLOY_SSH_KEY (private key generated above)
    Github variables:
    - PUBLIC_ORIGIN=https://playhaus.site
5. Run Deploy API, then Deploy Web App  
6. Make both GHCR packages public (they're private by default) — otherwise the droplet can't pull