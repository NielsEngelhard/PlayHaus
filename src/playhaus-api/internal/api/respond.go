package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Validator interface {
	Validate() map[string]string
}

func decode[T Validator](r *http.Request) (T, map[string]string, error) {
	var v T
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		return v, nil, fmt.Errorf("decode json: %w", err)
	}
	return v, v.Validate(), nil
}
