terraform {
  # 1.6 is where `templatefile` on a .tftpl and the current provider protocol both
  # settled. Anything newer works; nothing older is tested.
  required_version = ">= 1.6"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}
