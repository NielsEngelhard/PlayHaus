// Package gamestats keeps one running total of games created per game mode.
package gamestats

// GamesPlayed is the single row of totals; a game counts when it is created, not when it finishes.
type GamesPlayed struct {
	ID                                int64 `gorm:"primaryKey;autoIncrement:false"`
	LolWodPlayed                      int64 `gorm:"column:lol_wod_played;not null;default:0"`
	LolSoloPlayed                     int64 `gorm:"column:lol_solo_played;not null;default:0"`
	LolMpPlayed                       int64 `gorm:"column:lol_mp_played;not null;default:0"`
	QzSingleDevicePlayed              int64 `gorm:"column:qz_singledevice_played;not null;default:0"`
	QzMultiDevicePlayed               int64 `gorm:"column:qz_multidevice_played;not null;default:0"`
	QzMultiDeviceWithHostScreenPlayed int64 `gorm:"column:qz_multidevice_withhostscreen_played;not null;default:0"`
	OouSingleDevicePlayed             int64 `gorm:"column:oou_single_device_played;not null;default:0"`
	OouMultiDevicePlayed              int64 `gorm:"column:oou_multidevice_played;not null;default:0"`
	FfPlayed                          int64 `gorm:"column:ff_played;not null;default:0"`
	WwPlayed                          int64 `gorm:"column:ww_played;not null;default:0"`
}

func (GamesPlayed) TableName() string { return "games_played_aggregated_data" }

// rowID is the one row every counter lives on.
const rowID = 1

// Counter names one column; its value is the column name itself.
type Counter string

const (
	LolWod                        Counter = "lol_wod_played"
	LolSolo                       Counter = "lol_solo_played"
	LolMultiplayer                Counter = "lol_mp_played"
	QuizSingleDevice              Counter = "qz_singledevice_played"
	QuizMultiDevice               Counter = "qz_multidevice_played"
	QuizMultiDeviceWithHostScreen Counter = "qz_multidevice_withhostscreen_played"
	OouSingleDevice               Counter = "oou_single_device_played"
	OouMultiDevice                Counter = "oou_multidevice_played"
	FakeFiller                    Counter = "ff_played"
	WittyWars                     Counter = "ww_played"
)

func Models() []any {
	return []any{&GamesPlayed{}}
}
