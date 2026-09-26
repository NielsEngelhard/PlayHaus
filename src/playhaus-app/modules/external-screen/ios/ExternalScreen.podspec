Pod::Spec.new do |s|
  s.name           = 'ExternalScreen'
  s.version        = '1.0.0'
  s.summary        = 'Draws the PlayHaus quiz board on an AirPlay screen-mirroring display'
  s.description    = 'Draws the PlayHaus quiz board on an AirPlay screen-mirroring display'
  s.author         = ''
  s.homepage       = 'https://playhaus.site'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
