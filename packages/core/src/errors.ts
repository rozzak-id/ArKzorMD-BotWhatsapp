export class ComingSoonError extends Error {
  constructor(platform: string) {
    super(`${platform} belum tersedia pada v0.1 (Coming Soon).`);
    this.name = 'ComingSoonError';
  }
}

export class PlatformNotConnectedError extends Error {
  constructor(platform: string) {
    super(`Akun ${platform} belum terhubung. Sambungkan lewat Web UI.`);
    this.name = 'PlatformNotConnectedError';
  }
}
